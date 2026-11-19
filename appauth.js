// Shared app credential used by requests before a user signs in.
export const APP_AUTH_TOKEN =
  'SoN8HIgE3rYpS22E4ngvUj7Bj5PypE0JKUvbgIo3N7bMy1bVnhAWNKyFaMmBAnZz+n1Nyry29JujM3MmZJ4fdpzC2LMf0pCoR4a44dJxDXtutvdcMLZVBNoMYNcwbnx5Na1/ujDmC2SO/mCYZ8HXuL++c+EMS3EDVHc0gEcjxyEOb8rMv3q5XOY8Ha+hV0DIn5e1lfsp18cz9Kwm0mBlo9IykXIyeQyNCp1/AxhmaRQkb37BLRLOXfX251myZJbm';

export const getPublicAuthHeaders = () => ({
  Authorization: `Bearer ${APP_AUTH_TOKEN}`,
  UserId: '0',
});
