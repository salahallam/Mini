# Chatter Production Checklist

## Before deployment
- [ ] Set a strong `JWT_SECRET`
- [ ] Use a managed PostgreSQL database
- [ ] Set `CLIENT_URL` to the real frontend domain
- [ ] Enable HTTPS
- [ ] Configure CORS to the exact frontend origin
- [ ] Add rate limiting
- [ ] Add request validation
- [ ] Add structured logging
- [ ] Add database backups
- [ ] Add error monitoring
- [ ] Add pagination
- [ ] Add refresh-token/session strategy
- [ ] Review Socket.IO authorization for chat membership

## Functional QA
- [ ] Register with phone
- [ ] Register with email
- [ ] Login
- [ ] Logout
- [ ] Create a chat
- [ ] Send a message
- [ ] Receive a message in another browser
- [ ] Search contacts
- [ ] Refresh and preserve login session
