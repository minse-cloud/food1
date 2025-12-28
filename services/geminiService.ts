
import { GoogleGenAI, Type } from "@google/genai";
import { PlanState, MealOption, RecipeDetail, MealTime } from "../types.ts";

const extractJson = (text: string) => {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    const cleanText = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(cleanText.trim());
  } catch (e) {
    const startIdx = text.indexOf('[');
    const startObjIdx = text.indexOf('{');
    const start = (startIdx !== -1 && (startObjIdx === -1 || startIdx < startObjIdx)) ? startIdx : startObjIdx;
    if (start !== -1) {
      const end = text.lastIndexOf(startIdx !== -1 ? ']' : '}') + 1;
      try {
        return JSON.parse(text.substring(start, end));
      } catch (e2) {}
    }
    throw new Error("데이터 해석 오류. 다시 시도해 주세요.");
  }
};

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API 키 오류.");
  return new GoogleGenAI({ apiKey });
};

export const generateMenuOptions = async (plan: PlanState): Promise<Record<string, Record<MealTime, MealOption[]>>> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", // 속도 우선 모델
    contents: `대학교 전문 영양사 모드. '${plan.eventName}' 행사 식단 제안. 
    기간: ${plan.startDate}~${plan.endDate}, 식사: ${plan.mealTimes.join(",")}.
    한식 기반, 대량조리 용이, 단가 효율적인 메뉴 3개씩 추천. 
    각 메뉴의 구성 이유를 영양학적으로 짧게 포함.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                meals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            menuName: { type: Type.STRING },
                            description: { type: Type.STRING },
                            category: { type: Type.STRING }
                          },
                          required: ["menuName", "description", "category"]
                        }
                      }
                    },
                    required: ["time", "options"]
                  }
                }
              },
              required: ["date", "meals"]
            }
          }
        },
        required: ["recommendations"]
      }
    }
  });

  const raw = extractJson(response.text || "");
  const result: any = {};
  raw.recommendations?.forEach((day: any) => {
    result[day.date] = {};
    day.meals.forEach((meal: any) => {
      result[day.date][meal.time] = meal.options;
    });
  });
  return result;
};

export const calculateIngredientsAndRecipes = async (
  selections: { date?: string, mealTime?: string, menuName: string, headCount: number }[]
): Promise<RecipeDetail[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview", // 정확도 우선 모델
    contents: `영양사 발주 모드. 다음 메뉴의 1인당 표준량을 계산하고 인원수(${selections[0].headCount})를 곱해 총량을 산출하라. 
    데이터: ${JSON.stringify(selections)}.
    결과는 kg 또는 g 단위로 정확히 명시. 조리 공정은 100인분 이상 대량 조리 특화 공정으로 작성.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            mealTime: { type: Type.STRING },
            menuName: { type: Type.STRING },
            headCount: { type: Type.NUMBER },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  unit: { type: Type.STRING }
                },
                required: ["name", "amount", "unit"]
              }
            },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["menuName", "ingredients", "steps", "headCount"]
        }
      }
    }
  });

  const details: any[] = extractJson(response.text || "");
  return details.map(d => ({
    ...d,
    date: d.date || new Date().toISOString().split('T')[0],
    mealTime: d.mealTime || "점심",
    recipeLink: "" // 간소화를 위해 링크 제외 (속도 개선)
  }));
};
