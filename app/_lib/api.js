import get from 'lodash/get';

const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL;

async function fetchData(url, options = {}) {
  try {
    const response = await fetch(`${baseUrl}${url}`, options);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error; // Melemparkan kembali kesalahan untuk ditangani di tempat pemanggilan
  }
}

// Get CoverUrl function
function getCoverUrl(cover) {
  const coverUrl = get(cover, 'data[0].attributes.url');
  return coverUrl ? `${baseUrl}${coverUrl}` : null;
}

function getImagerUrl(image) {
  const imageUrl = image?.data?.attributes?.url;
  return imageUrl ? `${baseUrl}${imageUrl}` : null;
}

export async function getAllBlogs(page = 1, pageSize = 4) {
  try {
    const strapiData = await fetchData(
      `/api/posts?populate=cover&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort[0]=createdAt:desc`
    );
    if (!strapiData || !strapiData.data || !strapiData.data.length) return null;

    return {
      data: strapiData.data.map((post) => ({
        id: post.id,
        title: post.attributes.title,
        slug: post.attributes.slug,
        coverUrl: getCoverUrl(post.attributes.cover),
        tags:
          post.attributes.tags?.data.map((tag) => ({
            name: tag.attributes.name,
          })) || [],
        createdAt: post.attributes.createdAt,
      })),
      pagination: strapiData.meta.pagination,
    };
  } catch (error) {
    console.error('Error fetching all blogs:', error);
    return null;
  }
}

// Get Detail Blog by slug
export async function getBlogBySlug(slug) {
  try {
    const strapiData = await fetchData(
      `/api/posts?filters[slug][$eq]=${slug}&populate=cover,seo,tags`
    );
    if (!strapiData || !strapiData.data || !strapiData.data.length) return null;

    const post = strapiData.data[0];
    return {
      id: post.id,
      title: post.attributes.title,
      content: post.attributes.content,
      cover: getCoverUrl(post.attributes.cover),
      tags:
        post.attributes.tags?.data.map((tag) => ({
          name: tag.attributes.name,
          slug: tag.attributes.slug,
        })) || [],
      seo: post.attributes.seo,
      createdAt: post.attributes.createdAt,
    };
  } catch (error) {
    console.error(`Error fetching blog by slug ${slug}:`, error);
    return null;
  }
}

// Get Comments and Ratings by slug
export async function getCommentsAndRatingsBySlug(slug) {
  try {
    const commentsResponse = await fetchData(`/api/ratings/reviews/${slug}`);
    if (!commentsResponse) {
      return {
        comments: [],
        averageScore: 0,
        reviewsCount: 0,
      };
    }
    return {
      comments: commentsResponse.reviews || [],
      averageScore: commentsResponse.averageScore || 0,
      reviewsCount: commentsResponse.reviewsCount || 0,
    };
  } catch (error) {
    console.error(
      `Error fetching comments and ratings for slug ${slug}:`,
      error
    );
    return {
      comments: [],
      averageScore: 0,
      reviewsCount: 0,
    };
  }
}

// Post Comment and Rating
export async function postCommentAndRating(blogId, content, score, token) {
  try {
    const data = {
      comment: content,
      score: score,
    };

    return await fetchData(`/api/ratings/reviews/${blogId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error(
      `Error posting comment and rating for blogId ${blogId}:`,
      error
    );
    return null;
  }
}

export async function getBlogsByTag(tag, page = 1, pageSize = 8) {
  try {
    const strapiData = await fetchData(
      `/api/posts?filters[tags][slug][$eq]=${tag}&populate=cover,tags&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort[0]=createdAt:desc`
    );
    if (!strapiData || !strapiData.data || !strapiData.data.length) {
      return { data: [], pagination: { pageCount: 1 } };
    }

    return {
      data: strapiData.data.map((post) => ({
        id: post.id,
        title: post.attributes.title,
        slug: post.attributes.slug,
        tags: post.attributes.tags.data.map((tag) => tag.attributes),
        coverUrl: getCoverUrl(post.attributes.cover),
        createdAt: post.attributes.createdAt,
      })),
      pagination: strapiData.meta.pagination,
    };
  } catch (error) {
    console.error(`Error fetching blogs by tag ${tag}:`, error);
    return { data: [], pagination: { pageCount: 1 } };
  }
}

export async function getSimilarPosts(tags, currentPostId) {
  try {
    const tagFilters = tags
      .map((tag) => `filters[tags][name][$eq]=${tag}`)
      .join('&');
    const strapiData = await fetchData(
      `/api/posts?${tagFilters}&populate=cover,tags`
    );
    if (!strapiData || !strapiData.data) return [];

    return strapiData.data
      .filter((post) => post.id !== currentPostId) // Exclude the current post
      .map((post) => ({
        id: post.id,
        title: post.attributes.title,
        slug: post.attributes.slug,
        coverUrl: getCoverUrl(post.attributes.cover),
        tags: post.attributes.tags.data.map((tag) => tag.attributes),
        createdAt: post.attributes.createdAt,
      }));
  } catch (error) {
    console.error(
      `Error fetching similar posts for tags ${tags} and currentPostId ${currentPostId}:`,
      error
    );
    return [];
  }
}

export async function getBlogsByPage(page, pageSize) {
  try {
    const strapiData = await fetchData(
      `/api/posts?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=cover,seo,tags`
    );
    if (!strapiData || !strapiData.data) {
      return { posts: [], meta: {} };
    }

    const posts = strapiData.data.map((post) => ({
      id: post.id,
      title: post.attributes.title,
      content: post.attributes.content,
      cover: getCoverUrl(post.attributes.cover),
      tags:
        post.attributes.tags?.data.map((tag) => ({
          name: tag.attributes.name,
        })) || [],
      seo: {
        id: post.attributes.seo.id,
        SeoTitle: post.attributes.seo.SeoTitle,
        SeoDescription: post.attributes.seo.SeoDescription,
      },
      createdAt: post.attributes.createdAt,
    }));

    const meta = strapiData.meta.pagination;

    return { posts, meta };
  } catch (error) {
    console.error(
      `Error fetching blogs by page ${page} and pageSize ${pageSize}:`,
      error
    );
    return { posts: [], meta: {} };
  }
}

// Function to search posts
export async function searchPosts(query, page = 1, pageSize = 8) {
  try {
    const strapiData = await fetchData(
      `/api/posts?filters[title][$containsi]=${query}&pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=cover,tags`
    );
    if (!strapiData || !strapiData.data) return [];

    return {
      data: strapiData.data.map((post) => ({
        id: post.id,
        title: post.attributes.title,
        slug: post.attributes.slug,
        coverUrl: getCoverUrl(post.attributes.cover),
        tags:
          post.attributes.tags?.data.map((tag) => ({
            name: tag.attributes.name,
          })) || [],
        createdAt: post.attributes.createdAt,
      })),
      pagination: strapiData.meta.pagination,
    };
  } catch (error) {
    console.error(
      `Error searching posts with query ${query}, page ${page}, and pageSize ${pageSize}:`,
      error
    );
    return [];
  }
}

// Mengambil popular blogs berdasarkan rating
export async function getPopularBlogsByRating() {
  try {
    const strapiData = await fetchData('/api/posts?populate=cover,tags');
    if (!strapiData || !strapiData.data) return [];

    const postsWithRatings = await Promise.all(
      strapiData.data.map(async (post) => {
        const ratingData = await fetchData(
          `/api/ratings/reviews/${post.attributes.slug}/stats`
        );
        return {
          id: post.id,
          title: post.attributes.title,
          slug: post.attributes.slug,
          coverUrl: getCoverUrl(post.attributes.cover),
          tags:
            post.attributes.tags?.data.map((tag) => ({
              name: tag.attributes.name,
            })) || [],
          createdAt: post.attributes.createdAt,
          averageRating: ratingData?.averageScore || 0,
        };
      })
    );

    return postsWithRatings.sort((a, b) => b.averageRating - a.averageRating);
  } catch (error) {
    console.error('Error fetching popular blogs by rating:', error);
    return [];
  }
}

export async function getTags() {
  try {
    const response = await fetch(`${baseUrl}/api/tags?populate=image`);
    const strapiData = await response.json();

    if (!strapiData || !strapiData.data) return [];

    return strapiData.data.map((tag) => {
      const { id, attributes } = tag;
      const { name, slug, image } = attributes;

      const imageUrl = getImagerUrl(image);

      return {
        id,
        name,
        slug,
        image: imageUrl,
      };
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

export async function login(identifier, password) {
  try {
    const data = {
      identifier,
      password,
    };

    return await fetchData('/api/auth/local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return null;
  }
}

// Function to register
export async function register(username, email, password) {
  try {
    const data = {
      username,
      email,
      password,
    };

    return await fetchData('/api/auth/local/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Error registering:', error);
    return null;
  }
}

// Function to get user profile
export async function getProfile(token) {
  try {
    return await fetchData('/api/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
