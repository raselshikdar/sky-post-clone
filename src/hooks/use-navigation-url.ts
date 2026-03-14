export const useNavigationUrl = () => {
  const getAbsoluteUrl = (path: string) => {
    const baseUrl = "https://awaj.eu.cc";
    // যদি পাথ স্লাশ দিয়ে শুরু না হয়, তবে স্লাশ যোগ করবে
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${formattedPath}`;
  };

  return { getAbsoluteUrl };
};
