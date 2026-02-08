import { derived } from 'svelte/store';
import { page } from '$app/stores';

export const session = derived(page, ($page) => $page.data?.session ?? null);
export const user = derived(session, ($session) => $session?.user ?? null);
export const isAuthenticated = derived(session, ($session) => !!$session?.user);
