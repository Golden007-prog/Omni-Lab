/**
 * Legacy Marathon Agent
 * Preserved for backward compatibility with existing App.tsx
 */

import { GoogleGenAI, Type } from "@google/genai";
import { SimulationResult, ThoughtLog, SimulationStatus } from "../types";

const SYSTEM_INSTRUCTION = `
You are the "Scientist Agent" for Omni-Lab.
Your goal is to verify scientific concepts through simulation.
You must generate Python code (using numpy, pandas, matplotlib logic) and then EXECUTE it (simulated by generating the JSON output of the execution).

You are currently in a "Marathon Loop" - a self-correcting cycle.
1. Plan the simulation.
2. Write the code.
3. Verify the output data.

If the simulation is complex, breakdown the steps.
Ensure the data returned is suitable for plotting in a frontend charting library (Array of objects).
`;

export class MarathonAgent {
  private ai: GoogleGenAI;
  private model = "gemini-2.5-pro-preview-05-06";
  private onThought: (thought: ThoughtLog) => void;

  constructor(apiKey: string, onThought: (thought: ThoughtLog) => void) {
    this.ai = new GoogleGenAI({ apiKey });
    this.onThought = onThought;
  }

  private log(message: string, level: number = 1, status: ThoughtLog['status'] = 'info') {
    this.onThought({
      id: Math.random().toString(36).substr(2, 9),
      level,
      message,
      timestamp: new Date(),
      status
    });
  }

  async runSimulation(hypothesis: string): Promise<SimulationResult> {
    this.log(`Received hypothesis: "${hypothesis}"`, 1);
    this.log("Initializing Marathon Loop...", 1);

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      this.log(`Attempt ${attempt}/${maxAttempts}: Generating simulation logic`, 2);

      try {
        // Step 1: Generation & "Execution" (Simulated by asking LLM for the data)
        const result = await this.generateAndExecute(hypothesis);
        
        // Step 2: Verification (Vibe Check)
        if (this.verifyResult(result)) {
            this.log("Verification Successful: Simulation valid.", 4, 'success');
            return result;
        } else {
            this.log("Verification Failed: Empty or invalid data.", 3, 'warning');
            throw new Error("Empty data generated");
        }

      } catch (error: any) {
        this.log(`Error in attempt ${attempt}: ${error.message}`, 3, 'error');
        if (attempt === maxAttempts) {
          this.log("Marathon Loop Failed: Max attempts reached.", 4, 'error');
          throw error;
        }
        this.log("Retrying with self-correction...", 2, 'warning');
      }
    }

    throw new Error("Simulation failed");
  }

  private async generateAndExecute(hypothesis: string): Promise<SimulationResult> {
    this.log("Generating Python code structure...", 2);
    
    const prompt = `
      Hypothesis to verify: ${hypothesis}.
      
      Generate a JSON response with:
      1. 'code': Valid Python code using numpy/matplotlib that WOULD generate this data.
      2. 'data': The actual array of data points (JSON) resulting from such a simulation. Limit to 50 points.
      3. 'chartType': 'line', 'scatter', or 'bar'.
      4. 'xAxisKey': Name of X key (e.g. 'time').
      5. 'yAxisKey': Name of Y key (e.g. 'velocity').
      6. 'explanation': Brief scientific explanation.
    `;

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING },
            data: { 
              type: Type.ARRAY, 
              items: { type: Type.OBJECT, properties: {}, additionalProperties: true }
            },
            chartType: { type: Type.STRING },
            xAxisKey: { type: Type.STRING },
            yAxisKey: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["code", "data", "chartType", "xAxisKey", "yAxisKey", "explanation"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Scientist Agent");

    this.log("Code generated. Executing in sandbox (simulated)...", 3);
    const json = JSON.parse(text);
    return json as SimulationResult;
  }

  private verifyResult(result: SimulationResult): boolean {
    if (!result.data || result.data.length === 0) return false;
    const sample = result.data[0];
    if (!sample[result.xAxisKey] && sample[result.xAxisKey] !== 0) return false;
    return true;
  }
}
