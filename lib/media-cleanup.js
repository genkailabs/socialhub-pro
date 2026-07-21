export async function cleanOrphanedTempMedia({ supabase, maxAgeHours = 24 } = {}) {
  if (!supabase) throw new Error('Cliente Supabase obrigatório.');

  const { data: rootItems, error: rootError } = await supabase.storage.from('media').list('temp');
  if (rootError || !rootItems) return { ok: false, error: rootError?.message || 'Failed to list temp' };

  const { data: activePosts, error: activeError } = await supabase
    .from('posts')
    .select('id, media_url, media_urls, cover_url')
    .in('status', ['scheduled', 'publishing']);

  if (activeError) {
    console.error('Error fetching active posts:', activeError);
    return { ok: false, error: 'Failed to fetch active posts' };
  }

  const activeReferences = [];
  for (const post of activePosts || []) {
    if (post.media_url) activeReferences.push(post.media_url);
    if (post.cover_url) activeReferences.push(post.cover_url);
    if (post.media_urls && Array.isArray(post.media_urls)) {
      activeReferences.push(...post.media_urls.filter(Boolean));
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
      
      const isReferenced = activeReferences.some(ref => typeof ref === 'string' && ref.includes(filePath));

      if (!isReferenced) {
        pathsToRemove.push(filePath);
      }
    }
  };

  for (const item of rootItems) {
    await checkItem('', item);
  }

  let removedCount = 0;
  const removedPaths = [];

  if (pathsToRemove.length > 0) {
    // batch remove in chunks to avoid URL too long issues if there are many
    const chunkSize = 100;
    for (let i = 0; i < pathsToRemove.length; i += chunkSize) {
      const chunk = pathsToRemove.slice(i, i + chunkSize);
      try {
        const { data, error } = await supabase.storage.from('media').remove(chunk);
        if (error) {
          console.error('Failed to remove temp media chunk:', error);
        } else if (data) {
          removedCount += data.length;
          removedPaths.push(...chunk);
        }
      } catch (err) {
        console.error('Failed to remove temp media chunk', err);
      }
    }
  }

  return {
    ok: true,
    scannedCount,
    removedCount,
    removedPaths
  };
}
