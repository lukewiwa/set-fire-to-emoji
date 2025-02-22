function handler(event) {
  const request = event.request;
  request.headers["x-forwarded-host"] = { value: request.headers.host.value };
  return request;
}
