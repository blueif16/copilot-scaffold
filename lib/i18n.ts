export type Locale = "en" | "zh";

export const translations = {
  en: {
    appName: "Omniscience",
    footer: "Built with CopilotKit + LangGraph · Ages 6–12",

    // TopicCard
    level: "Level",
    ages: "Ages",
    startExploring: "Start exploring",

    // TopicCarousel
    pickATopic: "Pick a topic",
    moreComingSoon: "More coming soon",
    comingSoonSubtext: "Volcanoes, weather, ecosystems…",

    // CompanionHub - Greetings
    greetings: [
      "Hey there, scientist! Ready to explore?",
      "Welcome back! What shall we discover today?",
      "Ooh, I've been waiting for you! Let's learn something cool.",
      "Hi hi hi! Pick a topic or ask me anything!",
      "Science time! I'm SO excited!",
    ],

    // CompanionHub - Fun Facts
    funFacts: [
      "Did you know? Water can exist as solid, liquid, AND gas — all at the same time! It's called the triple point.",
      "Lightning is about 5 times hotter than the surface of the Sun!",
      "Your DNA is about 99.9% the same as every other human on Earth.",
      "Octopuses have three hearts and blue blood!",
      "A teaspoon of a neutron star would weigh about 6 billion tons!",
      "Bananas are slightly radioactive because they contain potassium.",
    ],

    // CompanionHub - Suggestions
    suggestions: [
      "Why does ice melt?",
      "What is electricity?",
      "How do genes work?",
      "Why is the sky blue?",
    ],

    // CompanionHub - Buttons
    surpriseMe: "Surprise me!",
    askAQuestion: "Ask a question",
    whatDoYouWantToKnow: "What do you want to know?",
    askAnything: "Ask anything about science…",
    listening: "Listening…",
    speakYourQuestion: "Listening… speak your question!",
    backToHome: "← back to home",

    // ChatOverlay
    askMeAnything: "Ask me anything!",
    close: "Close chat",
    askAQuestionAbout: "Ask a question about what you see!",
    typeAQuestion: "Type a question…",
    ask: "Ask",

    // LabNotebook
    askAboutThis: "Ask about this",
    previousPage: "Previous page",
    nextPage: "Next page",
    funFact: "Fun Fact",

    // Auth
    login: "Log in",
    signup: "Sign up",
    email: "Email",
    password: "Password",
    role: "I am a...",
    student: "Student",
    teacher: "Teacher",
    loginButton: "Log in",
    signupButton: "Sign up",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    loginError: "Login failed. Please check your credentials.",
    signupError: "Signup failed. Please try again.",
    welcomeBack: "Welcome back!",
    joinOmniscience: "Join Omniscience",
  },
  zh: {
    appName: "无垠科学",
    footer: "基于 CopilotKit + LangGraph 构建 · 适合 6-12 岁",

    // TopicCard
    level: "等级",
    ages: "年龄",
    startExploring: "开始探索",

    // TopicCarousel
    pickATopic: "选择一个主题",
    moreComingSoon: "更多即将推出",
    comingSoonSubtext: "火山、天气、生态系统……",

    // CompanionHub - Greetings
    greetings: [
      "嘿，小科学家！准备好探索了吗？",
      "欢迎回来！今天我们要发现什么呢？",
      "哦，我一直在等你！让我们学点酷的东西吧。",
      "嗨嗨嗨！选个主题或者问我任何问题！",
      "科学时间！我太兴奋了！",
    ],

    // CompanionHub - Fun Facts
    funFacts: [
      "你知道吗？水可以同时以固体、液体和气体的形式存在！这叫做三相点。",
      "闪电的温度大约是太阳表面温度的5倍！",
      "你的DNA与地球上其他人类有99.9%是相同的。",
      "章鱼有三颗心脏和蓝色的血液！",
      "一茶匙中子星物质重约60亿吨！",
      "香蕉含有钾元素，所以有轻微的放射性。",
    ],

    // CompanionHub - Suggestions
    suggestions: [
      "冰为什么会融化？",
      "什么是电？",
      "基因是如何工作的？",
      "天空为什么是蓝色的？",
    ],

    // CompanionHub - Buttons
    surpriseMe: "给我惊喜！",
    askAQuestion: "提问",
    whatDoYouWantToKnow: "你想知道什么？",
    askAnything: "问任何关于科学的问题……",
    listening: "正在听……",
    speakYourQuestion: "正在听……说出你的问题！",
    backToHome: "← 返回主页",

    // ChatOverlay
    askMeAnything: "问我任何问题！",
    close: "关闭聊天",
    askAQuestionAbout: "问一个关于你看到的问题！",
    typeAQuestion: "输入问题……",
    ask: "提问",

    // LabNotebook
    askAboutThis: "询问这个",
    previousPage: "上一页",
    nextPage: "下一页",
    funFact: "趣味知识",

    // Auth
    login: "登录",
    signup: "注册",
    email: "邮箱",
    password: "密码",
    role: "我是...",
    student: "学生",
    teacher: "教师",
    loginButton: "登录",
    signupButton: "注册",
    noAccount: "还没有账号？",
    haveAccount: "已有账号？",
    loginError: "登录失败。请检查您的凭据。",
    signupError: "注册失败。请重试。",
    welcomeBack: "欢迎回来！",
    joinOmniscience: "加入无垠科学",
  },
} as const;

export function getTranslation(locale: Locale) {
  return translations[locale];
}
