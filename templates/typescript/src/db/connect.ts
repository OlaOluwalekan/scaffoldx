<% if (useDatabase && orm == "Mongoose") {%>
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('connected to MongoDB');
  } catch (error) {
    console.log('MONGODB connection error:', error);
  }
};

export default connectDB;
<% } %>

<% if (useDatabase && orm == "Prisma") {%>
<% if (databaseType === 'Postgres') { %>
import { PrismaClient } from '../generated/prisma/index.js';
<% } else { %>
import { PrismaClient } from '@prisma/client';
<% } %>
const db = new PrismaClient();

export default db;
<% } %>