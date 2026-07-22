import { PostPreview } from './PostPreview';
import { CarouselPreview } from './CarouselPreview';
import { StoryPreview } from './StoryPreview';
import { ReelPreview } from './ReelPreview';

export function DynamicPreview({
  format = 'image',
  media = [],
  slide = 0,
  onSlideChange,
  caption = '',
  hashtags = '',
  brandName = 'sua_marca',
  cover = null,
  altText = '',
  storyOverlay = {},
  shareToFeed = true
}) {
  switch (format) {
    case 'carousel':
      return (
        <CarouselPreview
          media={media}
          slide={slide}
          onSlideChange={onSlideChange}
          caption={caption}
          hashtags={hashtags}
          brandName={brandName}
        />
      );
    case 'stories':
      return (
        <StoryPreview
          media={media}
          storyOverlay={storyOverlay}
          brandName={brandName}
        />
      );
    case 'reel':
      return (
        <ReelPreview
          media={media}
          cover={cover}
          caption={caption}
          hashtags={hashtags}
          brandName={brandName}
          shareToFeed={shareToFeed}
        />
      );
    case 'image':
    default:
      return (
        <PostPreview
          media={media}
          caption={caption}
          hashtags={hashtags}
          brandName={brandName}
          altText={altText}
        />
      );
  }
}
