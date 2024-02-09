import { connect } from "mongoose";

const connectToDatabase = async () => {
  const user = process.env.DB_USER;
  const password = process.env.DB_USER_PASSWORD;
  const databaseName = "fonnect_db";

  const mongoUrl = `mongodb+srv://${user}:${password}@atlascluster.pzxsrfp.mongodb.net/${databaseName}?retryWrites=true&w=majority`;

  try {
    await connect(mongoUrl);

    console.log("Connected to MongoDB");
  } catch (error) {
    console.log("Error connecting to MongoDB:", error);
  }
};

export default connectToDatabase;
