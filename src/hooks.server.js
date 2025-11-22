// Disable SSR globally since this is a client-side only app
// Firebase authentication and Firestore happen entirely in the browser
export const handle = async ({ event, resolve }) => {
	return resolve(event, {
		ssr: false
	});
};
