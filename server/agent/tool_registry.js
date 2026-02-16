import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const tools = {
  async route_planner(input) {
    const { planRoute } = await import('../tools/route_planner.js');
    return await planRoute(input);
  },

  async weather(input) {
    const city = input.city || 'Frederick';
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
    return await res.json();
  },

  async news(input) {
    const { category = 'general', country = 'us', query } = input;
    const url = query 
      ? `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`
      : `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&apiKey=${process.env.NEWS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.articles.slice(0, 10);
  },

  async code_analyzer(input) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'Analyze code and return: ## Critical Issues\n## Improvements\n## Refactored Snippet\n## Summary'
      }, {
        role: 'user',
        content: `Code:\n\`\`\`\n${input.code}\n\`\`\``
      }]
    });
    return completion.choices[0].message.content;
  },

  async code_editor(input) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'Return production-ready code only. Use best practices, secure syntax, minimal changes.'
      }, {
        role: 'user',
        content: input.text
      }]
    });
    return completion.choices[0].message.content;
  },

  async wikipedia(input) {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(input.query)}`);
    const data = await res.json();
    return `${data.title}\n\n${data.extract}\n\nRead more: ${data.content_urls?.desktop?.page || ''}`;
  },

  async translator(input) {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(input.text)}&langpair=en|es`);
    const data = await res.json();
    return `Original: ${input.text}\nTranslated: ${data.responseData.translatedText}`;
  },

  async games(input) {
    const { search, genre } = input;
    let url = `https://api.rawg.io/api/games?key=5ab37b5ba20e4739a66f7eb7c05da175&page_size=12`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    else url += `&ordering=-rating`;
    if (genre && genre !== 'all') url += `&genres=${genre}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results;
  },

  async music(input) {
    return { message: 'Music player ready', query: input.query };
  },

  async notepad(input) {
    return { message: 'Notepad ready', action: input.action };
  },

  async sketchpad(input) {
    return { message: 'Sketchpad ready', action: input.action };
  },

  async deal_finder(input) {
    // Placeholder for deal finding logic
    const query = input.query || input.item;
    return { 
      deals: [
        { title: `${query} - Best Deal`, price: '$299', source: 'Amazon', rating: 4.5 },
        { title: `${query} - Budget Option`, price: '$199', source: 'eBay', rating: 4.2 }
      ],
      summary: `Found 2 deals for ${query}`
    };
  },

  async maps(input) {
    return { message: 'Maps integration ready', location: input.location };
  },

  async internet_agent(input) {
    return { message: 'Internet agent ready', query: input.query };
  }
};
