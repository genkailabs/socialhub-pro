import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/lib/approval-actions', () => ({ requestApproval: vi.fn() }));
import { PostDetail } from '@/components/calendar/PostDetail';

beforeAll(() => vi.stubGlobal('React', React));
afterEach(() => cleanup());

describe('PostDetail scheduled editing', () => {
  it('offers to reopen scheduled visual-composer content without another upload', () => {
    render(
      <PostDetail
        post={{
          id: 'scheduled-1',
          status: 'scheduled',
          content: 'Campanha',
          production: { source: 'visual-composer' }
        }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /editar no composer/i }).getAttribute('href'))
      .toBe('/composer?post=scheduled-1');
  });
});
