const revokedTokens = new Map();

function revokeToken(token, expiresAtUnixSeconds) {
  if (!token) {
    return;
  }

  const expiresAtMs = Number(expiresAtUnixSeconds) * 1000;
  revokedTokens.set(token, expiresAtMs);
}

function isTokenRevoked(token) {
  if (!token) {
    return true;
  }

  const expiresAt = revokedTokens.get(token);
  if (!expiresAt) {
    return false;
  }

  if (Date.now() >= expiresAt) {
    revokedTokens.delete(token);
    return false;
  }

  return true;
}

module.exports = {
  revokeToken,
  isTokenRevoked
};
