const handle = async ({ event, resolve }) => {
  return resolve(event, {
    ssr: false
  });
};
export {
  handle
};
