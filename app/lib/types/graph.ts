export type NodeType = "content" | "concept";

export type DbNode = {
  id: string;
  user_id: string;
  type: NodeType;
  title: string;
  body: string;
  created_at: string;
};

export type DbEdge = {
  id: string;
  from_node_id: string;
  to_node_id: string;
  created_at: string;
};

export type NodeData = {
  title: string;
  body?: string;
};

export type DisplayedNode = {
  id: string;
  type: NodeType;
  data: NodeData;
};

/** Pre-computed geometry so an edge never has to cross a card. */
export type EdgeRoute = {
  path: string;
  labelX: number;
  labelY: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: "relationship";
  data?: EdgeRoute;
};
