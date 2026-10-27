type PagesContext = {
  request: Request;
  next: () => Promise<Response>;
};

export const onRequest = async ({ request, next }: PagesContext) => {
  const url = new URL(request.url);
  if (url.hostname.toLowerCase() === "www.mousi9ti.com") {
    url.protocol = "https:";
    url.hostname = "mousi9ti.com";
    return Response.redirect(url, 301);
  }

  return next();
};
