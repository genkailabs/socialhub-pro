import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('temporary composer media infrastructure', () => {
  it('cleans scheduled media immediately after the edge publisher succeeds', () => {
    const source = fs.readFileSync(path.join(root, 'supabase/functions/publish-due-posts/index.ts'), 'utf8');

    expect(source).not.toMatch(/Date\.now\(\)\s*\+\s*24\s*\*\s*3600/);
    expect(source).toMatch(/storage\.from\('media'\)\.remove\(temporaryPaths\)/);
    expect(source).toMatch(/media_url:\s*null/);
    expect(source).toMatch(/media_urls:\s*\[\]/);
    expect(source).toMatch(/production:\s*null/);
  });

  it('allows authenticated owners to delete only their temporary brand media', () => {
    const migration = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260723000200_composer_temporary_media.sql'),
      'utf8'
    );

    expect(migration).toMatch(/FOR DELETE TO authenticated/);
    expect(migration).toMatch(/storage\.foldername\(name\)/);
    expect(migration).toMatch(/brands[\s\S]*auth\.uid\(\)/);
  });
});
