// Lets async route handlers forward errors to Express (Express 4 does not do this itself).
export const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
