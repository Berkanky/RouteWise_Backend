const Joi = require("joi");

const GoogleDirectionsSchema = Joi.object({
  Latitude: Joi.required().messages({
    "any.required": "Latitude is required. ",
  }),
  Longitude: Joi.required().messages({
    "any.required": "Longitude is required. ",
  }),
  TravelMode: Joi.string().optional(),
  DestinationLocationLatitude: Joi.required().messages({
    "any.required": "Destination Location Latitude is required. ",
  }),
  DestinationLocationLongitude: Joi.required().messages({
    "any.required": "Destination Location Longitude is required. ",
  }),
});
module.exports = GoogleDirectionsSchema;