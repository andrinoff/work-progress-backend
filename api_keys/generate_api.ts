export default function newApi () {
  const random = crypto.randomUUID();
  const apiKey = "workp-" + random
  return apiKey ;
}