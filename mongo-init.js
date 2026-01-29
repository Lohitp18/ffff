// MongoDB initialization script
// This runs when the container is first created

// Create the application database and user
db = db.getSiblingDB('alumni_portal');

// Create application user with readWrite access
db.createUser({
  user: 'alumniuser',
  pwd: 'alumnipassword',
  roles: [
    {
      role: 'readWrite',
      db: 'alumni_portal'
    }
  ]
});

// Create initial indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ status: 1 });
db.users.createIndex({ institution: 1 });
db.users.createIndex({ year: 1 });
db.users.createIndex({ createdAt: -1 });

db.posts.createIndex({ authorId: 1 });
db.posts.createIndex({ status: 1 });
db.posts.createIndex({ createdAt: -1 });

db.events.createIndex({ status: 1 });
db.events.createIndex({ createdAt: -1 });

db.opportunities.createIndex({ status: 1 });
db.opportunities.createIndex({ createdAt: -1 });

db.institutionposts.createIndex({ institution: 1 });
db.institutionposts.createIndex({ status: 1 });
db.institutionposts.createIndex({ createdAt: -1 });

db.connections.createIndex({ requester: 1, recipient: 1 });
db.connections.createIndex({ status: 1 });

db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ createdAt: -1 });

db.reports.createIndex({ reportedItemType: 1 });
db.reports.createIndex({ status: 1 });
db.reports.createIndex({ createdAt: -1 });

print('Database initialization completed successfully!');
