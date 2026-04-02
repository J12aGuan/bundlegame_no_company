import { generateAuthToken } from '../src/lib/authToken.js';

const args = process.argv.slice(2);
const userIds = args.map((value) => String(value ?? '').trim()).filter(Boolean);

if (!userIds.length) {
	console.error('Usage: npm run token -- <user-id> [more-user-ids]');
	process.exit(1);
}

for (const userId of userIds) {
	console.log(`${userId}: ${generateAuthToken(userId)}`);
}
