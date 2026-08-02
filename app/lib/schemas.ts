import { Schema } from "effect";

export const ContentNode = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  text: Schema.String,
});

export type ContentNode = typeof ContentNode.Type;

export const ConceptNode = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  text: Schema.String,
});

export type ConceptNode = typeof ConceptNode.Type;
