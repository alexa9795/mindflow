import {
  api,
  API_URL,
  setToken,
  setRefreshToken,
  setUnauthorizedHandler,
  setTokensRefreshedHandler,
  ApiError,
  NetworkError,
  TimeoutError,
  SubscriptionLimitError,
} from '../api';

/** Build a minimal Response-like object for the mocked fetch. */
function mockResponse(status: number, body?: unknown): Partial<Response> {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error('no JSON body');
      return body;
    },
  };
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as typeof fetch;
  setToken(null);
  setRefreshToken(null);
  setUnauthorizedHandler(() => {});
  setTokensRefreshedHandler(() => {});
});

describe('request layer', () => {
  it('sends JSON body and returns the parsed response on success', async () => {
    const payload = { access_token: 'a', refresh_token: 'r', user: { id: '1' } };
    fetchMock.mockResolvedValueOnce(mockResponse(200, payload));

    const result = await api.login('me@example.com', 'pw');

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/auth/login`);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ email: 'me@example.com', password: 'pw' });
  });

  it('attaches the Authorization header when a token is set', async () => {
    setToken('tok123');
    fetchMock.mockResolvedValueOnce(mockResponse(200, { id: '1' }));

    await api.getMe();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer tok123');
  });

  it('returns undefined for a 204 No Content response', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(204));

    await expect(api.deleteEntry('abc')).resolves.toBeUndefined();
  });

  it('throws ApiError carrying the server message and code', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(400, { error: { message: 'Bad email', code: 'INVALID_EMAIL' } }),
    );

    await expect(api.login('x', 'y')).rejects.toMatchObject({
      constructor: ApiError,
      status: 400,
      message: 'Bad email',
      code: 'INVALID_EMAIL',
    });
  });

  it('falls back to an HTTP status message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(500));

    await expect(api.getMe()).rejects.toMatchObject({ status: 500, message: 'HTTP 500' });
  });

  it('wraps fetch rejections as NetworkError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(api.getMe()).rejects.toBeInstanceOf(NetworkError);
  });

  it('wraps an aborted request as TimeoutError', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abort);

    await expect(api.getMe()).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe('401 refresh flow', () => {
  it('refreshes the token then retries the original request', async () => {
    setToken('stale');
    setRefreshToken('refresh-me');
    const onRefreshed = jest.fn();
    setTokensRefreshedHandler(onRefreshed);

    const newTokens = {
      access_token: 'fresh',
      refresh_token: 'refresh2',
      access_token_expires_at: '',
      refresh_token_expires_at: '',
    };
    fetchMock
      .mockResolvedValueOnce(mockResponse(401)) // original → expired
      .mockResolvedValueOnce(mockResponse(200, newTokens)) // /refresh
      .mockResolvedValueOnce(mockResponse(200, { id: '1', email: 'me@x.com' })); // retry

    const me = await api.getMe();

    expect(me).toMatchObject({ id: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/auth/refresh`);
    expect(onRefreshed).toHaveBeenCalledWith(newTokens);
  });

  it('signals unauthorized and throws when the refresh itself fails', async () => {
    setToken('stale');
    setRefreshToken('bad-refresh');
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    fetchMock
      .mockResolvedValueOnce(mockResponse(401)) // original → expired
      .mockResolvedValueOnce(mockResponse(401)); // refresh also rejected

    await expect(api.getMe()).rejects.toMatchObject({
      constructor: ApiError,
      status: 401,
      message: 'Session expired. Please sign in again.',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('createEntry subscription limit', () => {
  it('maps the SUBSCRIPTION_LIMIT_REACHED error code to SubscriptionLimitError', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(403, {
        error: { message: 'Monthly limit reached', code: 'SUBSCRIPTION_LIMIT_REACHED' },
      }),
    );

    await expect(api.createEntry('hello')).rejects.toBeInstanceOf(SubscriptionLimitError);
  });

  it('rethrows other errors from createEntry unchanged', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(400, { error: { message: 'Empty', code: 'VALIDATION' } }),
    );

    const err = await api.createEntry('').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(SubscriptionLimitError);
  });
});
