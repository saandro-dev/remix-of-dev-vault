export interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  constraints?: string;
}

export interface ApiResponseExample {
  status: number;
  label: string;
  description: string;
  body: string;
}

export interface ApiCodeExample {
  language: string;
  label: string;
  code: string;
}

export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  description: string;
  params: ApiParam[];
  responses: ApiResponseExample[];
  examples: ApiCodeExample[];
}

export interface ApiSection {
  id: string;
  title: string;
  content: string;
}
