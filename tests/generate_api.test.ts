import newApi from "../api_keys/generate_api";

describe("API Key Generation", () => {
  it("should generate a new API key", () => {
    const { apiKey } = newApi();
    expect(apiKey).toMatch(/^workp-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});