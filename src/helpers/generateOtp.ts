export const generateReportId = () => {
  const code = Math.floor(1000000 + Math.random() * 9000000);
  return `R-${code}`;
};
export const generateExperId = () => {
  const code = Math.floor(1000000 + Math.random() * 9000000);
  return `CE-${code}`;
};
export const generateSeekerId = () => {
  const code = Math.floor(1000000 + Math.random() * 9000000);
  return `JS-${code}`;
};
export const generateSessionId = () => {
  const code = Math.floor(1000000 + Math.random() * 9000000);
  return `S-${code}`;
};
export const generateOrderId = () => {
  const code = Math.floor(1000000 + Math.random() * 9000000);
  return `O-${code}`;
};
export const generateTransactionId = () => {
  const code = Math.floor(1000000 + Math.random() * 9000000);
  return `TR-${code}`;
};
export const generateWithdrawId = () => {
  const code = Math.floor(1000000 + Math.random() * 9000000);
  return `WD-${code}`;
};
