import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Crypto Trade API",
    version: "1.0.0",
    description: "API documentation for the Crypto Trading Platform",
  },
};

const options = {
  swaggerDefinition,
  apis: [
    "../routes/api.js",
    "../app.js",
    "../models/*.js",
    "../controllers/*.js",
  ],
};

export default swaggerJSDoc(options);
