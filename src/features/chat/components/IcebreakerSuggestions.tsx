import React from 'react';

interface IcebreakerSuggestionsProps {
  category?: string;
  onSelectSuggestion: (text: string) => void;
}

const STATIC_ICEBREAKERS: Record<string, string[]> = {
  hackathon: [
    'Are you planning to build something in web, mobile, or AI?',
    'What tech stack or tools are you most excited to use today?',
    'Shall we grab a coffee and brainstorm team ideas before the kickoff?',
  ],
  coffee: [
    'What are you currently studying, and what year are you in?',
    'Do you have a favourite spot on campus or in town for studying?',
    'What kind of projects or hobbies have you been working on lately?',
  ],
  grocery_shopping: [
    'Which grocery stores nearby do you usually find the best student deals at?',
    'What time works best for you to head out for shopping?',
  ],
  cinema: [
    'What genres of movies do you enjoy the most?',
    'Have you seen any great films recently that you recommend?',
  ],
  default: [
    'Hi! Looking forward to the activity. What time are you planning to arrive?',
    'Have you been to this event or venue before?',
    'What made you interested in joining this activity today?',
  ],
};

export const IcebreakerSuggestions: React.FC<IcebreakerSuggestionsProps> = ({
  category = 'default',
  onSelectSuggestion,
}) => {
  const list =
    STATIC_ICEBREAKERS[category.toLowerCase()] || STATIC_ICEBREAKERS.default;

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
        <span>💡 Suggested icebreaker questions (tap to insert):</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {list.map((question, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectSuggestion(question)}
            className="text-[11px] text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 px-2.5 py-1 rounded-lg text-left transition-colors"
          >
            "{question}"
          </button>
        ))}
      </div>
    </div>
  );
};
