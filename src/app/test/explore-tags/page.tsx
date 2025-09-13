import { fetchFromHasura } from '@/lib/hasuraClient'
import React from 'react'

type CommonOffersTags = {
    id: number
    tags: string[]
}

type tags = {
    tag : string,
    count: number
}

const page = async() => {

    const { common_offers } = await fetchFromHasura(`
    query MyQuery {
      common_offers {
      id
      tags
    }
    }`)

    const tagsArray: string[][] = common_offers.map((offer: CommonOffersTags) => offer.tags);
    const flattenedTags: string[] = tagsArray.flat();
    const uniqueTags: string[] = Array.from(new Set(flattenedTags));

    const tagsWithCount: tags[] = uniqueTags.map((tag) => {
        const count = flattenedTags.filter((t) => t === tag).length;
        return { tag, count };
    });

    const sortedTagsWithCount = tagsWithCount.sort((a, b) => b.count - a.count);


  return (
    <div>

        {sortedTagsWithCount.map(({tag, count}) => (
            <div key={tag}>
                <span>{tag}</span> - <span>{`(${count})`}</span>
            </div>
        ))}
    </div>
  )
}

export default page