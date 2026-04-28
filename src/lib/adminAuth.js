import { browser } from '$app/environment';
import { getIdTokenResult, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from './firebaseConfig.js';

export function subscribeAdminAuth(callback) {
    if (!browser || !auth || typeof callback !== 'function') {
        callback?.({ loading: false, user: null, isAdmin: false, error: 'Firebase Auth is unavailable.' });
        return () => {};
    }

    return onAuthStateChanged(
        auth,
        async (user) => {
            if (!user) {
                callback({ loading: false, user: null, isAdmin: false, error: '' });
                return;
            }

            try {
                const token = await getIdTokenResult(user, true);
                const isAdmin = token?.claims?.admin === true;
                callback({
                    loading: false,
                    user,
                    isAdmin,
                    error: isAdmin ? '' : 'This Firebase account is signed in but does not have the admin claim.'
                });
            } catch (error) {
                callback({
                    loading: false,
                    user,
                    isAdmin: false,
                    error: error?.message || 'Unable to verify admin access.'
                });
            }
        },
        (error) => {
            callback({
                loading: false,
                user: null,
                isAdmin: false,
                error: error?.message || 'Unable to read Firebase authentication state.'
            });
        }
    );
}

export async function signInAdmin(email, password) {
    if (!auth) throw new Error('Firebase Auth is unavailable.');
    const normalizedEmail = String(email || '').trim();
    if (!normalizedEmail || !password) throw new Error('Enter the admin email and password.');

    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const token = await getIdTokenResult(credential.user, true);
    if (token?.claims?.admin !== true) {
        await signOut(auth);
        throw new Error('Signed in, but this account does not have the admin claim.');
    }
    return credential.user;
}

export async function signOutAdmin() {
    if (!auth) return;
    await signOut(auth);
}
