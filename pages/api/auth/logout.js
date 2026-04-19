export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Path=/; Max-Age=0');
  res.status(200).json({ success: true });
}
