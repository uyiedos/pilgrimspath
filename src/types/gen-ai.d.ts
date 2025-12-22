declare module '@google/generative-ai' {
  export interface GenerateContentResponse {
    candidates?: Array<{
      content: {
        parts: Array<{
          inlineData?: {
            data: string;
          };
        }>;
      };
    }>;
  }
}
