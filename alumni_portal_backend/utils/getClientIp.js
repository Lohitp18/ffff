/**
 * Securely extracts the true client IP address from the request.
 * 
 * @param {Object} req - Express request object
 * @returns {String} The true client IP
 */
function getClientIp(req) {
  // Trusting proxy via Express config is preferred:
  // app.set("trust proxy", true);
  // Then req.ip will inherently be the correct forwarded IP.
  
  // 1. Check for x-forwarded-for header which is standard for proxies/LBs
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list: "clientIP, proxy1, proxy2"
    // The first IP is the real client IP.
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  // 2. Fallback to standard req.ip
  if (req.ip) {
    return req.ip;
  }

  // 3. Fallback to socket remoteAddress
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  return '0.0.0.0';
}

module.exports = getClientIp;
