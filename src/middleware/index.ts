import { defineMiddleware } from 'astro:middleware';
import { supabase } from '../lib/supabase';
import micromatch from 'micromatch';

const protectedRoutes = ['/song/(|/)', '/favs(|/)', '/profile(|/)'];
const redirectRoutes = ['/signin(|/)'];
const proptectedAPIRoutes: any = [
    '/api/playlist(|/)',
    '/api/playlist/:id(|/)',
    '/api/search(|/)',
    '/api/search(|/:id(|/))',
    '/api/music/isFav(|/:id(|/))',
    '/api/music/addFav(|/:id(|/))',
    '/api/music/removeFav(|/:id(|/))',
];

export const onRequest = defineMiddleware(
    async ({ locals, url, cookies, redirect }, next) => {
        if (micromatch.isMatch(url.pathname, protectedRoutes)) {
            const accessToken = cookies.get('sb-access-token');
            const refreshToken = cookies.get('sb-refresh-token');
            //console.log(accessToken, refreshToken, 'aaa');
            if (!accessToken || !refreshToken) {
                return redirect('/signin');
            }

            const { data, error } = await supabase.auth.setSession({
                refresh_token: refreshToken.value,
                access_token: accessToken.value,
            });

            if (error) {
                cookies.delete('sb-access-token', {
                    path: '/',
                });
                cookies.delete('sb-refresh-token', {
                    path: '/',
                });
                return redirect('/signin');
            }

            //locals.email = data.user?.email!;
            cookies.set('sb-access-token', data?.session?.access_token!, {
                sameSite: 'strict',
                path: '/',
                secure: true,
            });
            cookies.set('sb-refresh-token', data?.session?.refresh_token!, {
                sameSite: 'strict',
                path: '/',
                secure: true,
            });
        }

        if (micromatch.isMatch(url.pathname, redirectRoutes)) {
            const accessToken = cookies.get('sb-access-token');
            const refreshToken = cookies.get('sb-refresh-token');

            if (accessToken && refreshToken) {
                return redirect('/');
            }
        }

        if (micromatch.isMatch(url.pathname, proptectedAPIRoutes)) {
            const accessToken = cookies.get('sb-access-token');
            const refreshToken = cookies.get('sb-refresh-token');

            // Check for tokens
            if (!accessToken || !refreshToken) {
                return new Response(
                    JSON.stringify({
                        error: 'Unauthorized',
                    }),
                    { status: 401 }
                );
            }

            // Verify the tokens
            const { error } = await supabase.auth.setSession({
                access_token: accessToken.value,
                refresh_token: refreshToken.value,
            });

            if (error) {
                return new Response(
                    JSON.stringify({
                        error: 'Unauthorized',
                    }),
                    { status: 401 }
                );
            }
        }

        return next();
    }
);
