export const PROTECTED_STATUSES = ['draft', 'awaiting_approval', 'waiting_approval', 'scheduled', 'publishing', 'ready_to_post'];
export const ELIGIBLE_STATUSES = ['published', 'posted_manually', 'failed', 'error', 'cancelled'];

export function extractStoragePath(urlOrPath, bucket = 'media') {
  if (typeof urlOrPath !== 'string' || !urlOrPath.trim()) return null;
  const clean = urlOrPath.trim().split('?')[0];
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;
    const signPrefix = `/storage/v1/object/sign/${bucket}/`;
    const directPrefix = `/storage/v1/object/${bucket}/`;
    for (const prefix of [publicPrefix, signPrefix, directPrefix]) {
      const idx = clean.indexOf(prefix);
      if (idx !== -1) {
        return clean.slice(idx + prefix.length).replace(/^\/+/, '');
      }
    }
    return null;
  }
  return clean.replace(/^\/+/, '');
}

export async function cleanOrphanedTempMedia({ supabase, maxAgeHours = 24, dryRun } = {}) {
  if (!supabase) throw new Error('Cliente Supabase obrigatório.');

  const isDryRun = dryRun !== undefined ? Boolean(dryRun) : process.env.MEDIA_GC_DRY_RUN === 'true';

  const { data: rootItems, error: rootError } = await supabase.storage.from('media').list('temp');
  if (rootError || !rootItems) return { ok: false, error: rootError?.message || 'Failed to list temp' };

  // 1. Fetch active posts in protected statuses
  const { data: activePosts, error: activeError } = await supabase
    .from('posts')
    .select('id, status, media_url, cover_url, cover_storage_path, internal_reference_url, media_urls')
    .in('status', PROTECTED_STATUSES);

  if (activeError) {
    console.error('Error fetching active posts:', activeError);
    return { ok: false, error: 'Failed to fetch active posts' };
  }

  // Also fetch any protected posts_media paths for protected active posts
  let activePostsMediaPaths = [];
  if (activePosts && activePosts.length > 0) {
    const activePostIds = activePosts.map(p => p.id).filter(Boolean);
    if (activePostIds.length > 0) {
      try {
        const { data: activeMedia } = await supabase
          .from('posts_media')
          .select('storage_path, post_id')
          .in('post_id', activePostIds);
        if (activeMedia && Array.isArray(activeMedia)) {
          activePostsMediaPaths = activeMedia.map(m => m.storage_path).filter(Boolean);
        }
      } catch (e) {
        console.error('Error fetching active posts_media:', e);
      }
    }
  }

  const activeReferences = [];
  for (const post of activePosts || []) {
    const candidates = [
      post.media_url,
      post.cover_url,
      post.cover_storage_path,
      post.internal_reference_url,
      ...(Array.isArray(post.media_urls) ? post.media_urls : [])
    ];
    for (const cand of candidates) {
      if (typeof cand === 'string' && cand) {
        activeReferences.push(cand);
        const rel = extractStoragePath(cand);
        if (rel) activeReferences.push(rel);
      }
    }
  }
  for (const p of activePostsMediaPaths) {
    if (typeof p === 'string' && p) {
      activeReferences.push(p);
      const rel = extractStoragePath(p);
      if (rel) activeReferences.push(rel);
    }
  }

  let scannedCount = 0;
  const pathsToRemove = [];

  const checkItem = async (folderPath, item) => {
    // If it's a folder (id is null or it has no metadata)
    if (!item.metadata || item.id === null) {
      const subPath = folderPath ? `${folderPath}/${item.name}` : item.name;
      const { data: subItems } = await supabase.storage.from('media').list(`temp/${subPath}`);
      if (subItems) {
        for (const subItem of subItems) {
          await checkItem(subPath, subItem);
        }
      }
      return;
    }

    // It's a file
    scannedCount++;
    const fileDateStr = item.created_at || item.updated_at;
    if (!fileDateStr) return; // Cannot determine age

    const fileDate = new Date(fileDateStr).getTime();
    const ageHours = (Date.now() - fileDate) / (1000 * 60 * 60);

    if (ageHours >= maxAgeHours) {
      const filePath = folderPath ? `temp/${folderPath}/${item.name}` : `temp/${item.name}`;
      
      const isReferenced = activeReferences.some(ref => typeof ref === 'string' && (ref === filePath || ref.includes(filePath)));

      if (!isReferenced) {
        pathsToRemove.push(filePath);
      }
    }
  };

  for (const item of rootItems) {
    await checkItem('', item);
  }

  const nowIso = new Date().toISOString();

  // 2. Query expired posts_media
  const expiredMediaEligible = [];
  try {
    const { data: expiredMedia, error: expiredMediaError } = await supabase
      .from('posts_media')
      .select('id, post_id, storage_path, deletion_attempts')
      .lte('delete_after', nowIso)
      .is('deleted_at', null);

    if (expiredMedia && Array.isArray(expiredMedia) && !expiredMediaError) {
      const postIds = [...new Set(expiredMedia.map(m => m.post_id).filter(Boolean))];
      const postsStatusMap = new Map();

      for (const p of (activePosts || [])) {
        postsStatusMap.set(p.id, p.status);
      }

      const missingPostIds = postIds.filter(id => !postsStatusMap.has(id));
      if (missingPostIds.length > 0) {
        const { data: fetchedPosts } = await supabase
          .from('posts')
          .select('id, status')
          .in('id', missingPostIds);
        for (const fp of (fetchedPosts || [])) {
          postsStatusMap.set(fp.id, fp.status);
        }
      }

      for (const m of expiredMedia) {
        if (m.post_id) {
          const pStatus = postsStatusMap.get(m.post_id);
          if (PROTECTED_STATUSES.includes(pStatus)) {
            continue; // skip if post is in protected status
          }
        }
        const path = extractStoragePath(m.storage_path);
        if (path) {
          expiredMediaEligible.push({ ...m, storagePathClean: path });
        }
      }
    }
  } catch (err) {
    console.error('Error checking expired posts_media:', err);
  }

  // 3. Query expired posts
  const expiredPostsEligible = [];
  const expiredPostsPaths = [];
  try {
    const { data: expiredPosts, error: expiredPostsError } = await supabase
      .from('posts')
      .select('id, status, media_url, cover_url, cover_storage_path, internal_reference_url, media_urls')
      .lte('delete_after', nowIso)
      .is('deleted_at', null)
      .in('status', ELIGIBLE_STATUSES);

    if (expiredPosts && Array.isArray(expiredPosts) && !expiredPostsError) {
      for (const p of expiredPosts) {
        const postPaths = [];
        const candidates = [
          p.media_url,
          p.cover_url,
          p.cover_storage_path,
          p.internal_reference_url,
          ...(Array.isArray(p.media_urls) ? p.media_urls : [])
        ];
        for (const cand of candidates) {
          const clean = extractStoragePath(cand);
          if (clean) postPaths.push(clean);
        }
        if (postPaths.length > 0) {
          expiredPostsEligible.push({ id: p.id, paths: postPaths });
          expiredPostsPaths.push(...postPaths);
        } else {
          expiredPostsEligible.push({ id: p.id, paths: [] });
        }
      }
    }
  } catch (err) {
    console.error('Error checking expired posts:', err);
  }

  const allPathsToRemove = [...new Set([
    ...pathsToRemove,
    ...expiredMediaEligible.map(m => m.storagePathClean),
    ...expiredPostsPaths
  ])];

  if (isDryRun) {
    return {
      ok: true,
      scannedCount,
      removedCount: allPathsToRemove.length,
      removedPaths: allPathsToRemove,
      simulatedPaths: allPathsToRemove
    };
  }

  let removedCount = 0;
  const removedPaths = [];
  const failedPaths = new Set();
  const pathErrors = new Map();

  if (allPathsToRemove.length > 0) {
    const chunkSize = 50;
    for (let i = 0; i < allPathsToRemove.length; i += chunkSize) {
      const chunk = allPathsToRemove.slice(i, i + chunkSize);
      try {
        const { data, error } = await supabase.storage.from('media').remove(chunk);
        if (error) {
          console.error('Failed to remove media chunk:', error);
          for (const p of chunk) {
            failedPaths.add(p);
            pathErrors.set(p, error.message || String(error));
          }
        } else if (data) {
          removedCount += data.length;
          removedPaths.push(...chunk);
        } else {
          removedCount += chunk.length;
          removedPaths.push(...chunk);
        }
      } catch (err) {
        console.error('Failed to remove media chunk exception:', err);
        for (const p of chunk) {
          failedPaths.add(p);
          pathErrors.set(p, err.message || String(err));
        }
      }
    }
  }

  // Update DB for posts_media
  if (expiredMediaEligible.length > 0) {
    const successfulMediaIds = [];
    const failedMediaItems = [];

    for (const m of expiredMediaEligible) {
      if (failedPaths.has(m.storagePathClean)) {
        failedMediaItems.push({
          id: m.id,
          attempts: (m.deletion_attempts || 0) + 1,
          error: pathErrors.get(m.storagePathClean) || 'Storage removal failed'
        });
      } else {
        successfulMediaIds.push(m.id);
      }
    }

    if (successfulMediaIds.length > 0) {
      try {
        await supabase
          .from('posts_media')
          .update({ deleted_at: nowIso, updated_at: nowIso })
          .in('id', successfulMediaIds);
      } catch (err) {
        console.error('Failed to update deleted_at on posts_media:', err);
      }
    }

    for (const failItem of failedMediaItems) {
      try {
        await supabase
          .from('posts_media')
          .update({
            deletion_attempts: failItem.attempts,
            last_deletion_error: failItem.error,
            updated_at: nowIso
          })
          .eq('id', failItem.id);
      } catch (err) {
        console.error('Failed to update deletion error on posts_media:', err);
      }
    }
  }

  // Update DB for posts
  if (expiredPostsEligible.length > 0) {
    const successfulPostIds = [];
    for (const p of expiredPostsEligible) {
      const anyPathFailed = p.paths.some(path => failedPaths.has(path));
      if (!anyPathFailed) {
        successfulPostIds.push(p.id);
      }
    }

    if (successfulPostIds.length > 0) {
      try {
        await supabase
          .from('posts')
          .update({
            media_url: null,
            media_urls: [],
            cover_url: null,
            cover_storage_path: null,
            internal_reference_url: null,
            production: null,
            delete_after: null,
            updated_at: nowIso
          })
          .in('id', successfulPostIds);
      } catch (err) {
        console.error('Failed to clear expired media references on posts:', err);
      }
    }
  }

  return {
    ok: true,
    scannedCount,
    removedCount,
    removedPaths,
    simulatedPaths: []
  };
}
