// middleware/roleAuth.js
function roleAuth(allowedRoles = []) {
  return (req, res, next) => {
    try {
        const userId = req.headers["x-user-id"];
        const userRole = req.headers["x-user-role"];
        const token = req.headers["x-user-token"];
        
      if (!token) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
        });
      }
      req.user = { id: userId, role: userRole };
      next();
    } catch (err) {
      console.error("Role Auth Error:", err);
      res.status(500).json({ error: "Internal server error during role check" });
    }
  };
}

module.exports = roleAuth;
