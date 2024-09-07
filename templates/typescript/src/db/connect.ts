import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("connected to MongoDB");
  } catch (error) {
    console.log("MONGODB connection error:", error);
  }
};

export default connectDB;
