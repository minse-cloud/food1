
export type MealTime = '아침' | '점심' | '저녁' | '야식';
export type AppMode = 'dashboard' | 'eventPlan' | 'singleRecipe' | 'customPlan' | 'savedReports';

export interface MealOption {
  menuName: string;
  description: string;
  category: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface RecipeDetail {
  date: string;
  mealTime: MealTime;
  menuName: string;
  ingredients: Ingredient[];
  steps: string[];
  recipeLink: string;
  headCount?: number;
}

export interface SavedReport {
  id: string;
  title: string;
  createdAt: string;
  data: RecipeDetail[];
}

export interface IngredientSummary {
  name: string;
  totalAmount: number;
  unit: string;
  breakdown: {
    date: string;
    mealTime: string;
    amount: string;
    menuName?: string;
  }[];
}

export interface PlanState {
  eventName: string;
  headCount: number;
  startDate: string;
  endDate: string;
  mealTimes: MealTime[];
}

export interface CustomMealEntry {
  id: string;
  date: string;
  mealTime: MealTime;
  headCount: number;
  menuName: string;
}
