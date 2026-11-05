export type EnquiryChannel = "Instagram" | "WhatsApp" | "Facebook";

export type DemoEnquiry = {
  id: string;
  name: string;
  channel: EnquiryChannel;
  receivedAt: string;
  message: string;
};

export type IntakeReview = {
  intent: string;
  serviceInterest: string;
  summary: string;
  missingInformation: string[];
  nextStep: string;
  replyDraft: string;
  journeyStage: string;
  riskLevel: "low" | "attention" | "high";
  requiresHumanReview: true;
};

export const demoEnquiries: DemoEnquiry[] = [
  {
    id: "ENQ-001",
    name: "Marina S.",
    channel: "Instagram",
    receivedAt: "12:04",
    message: "Oi! Vi o perfil de vocês e queria saber os valores. Não sei qual atendimento escolher.",
  },
  {
    id: "ENQ-002",
    name: "Alex R.",
    channel: "WhatsApp",
    receivedAt: "11:48",
    message: "Hi, I would like to book the 60-minute session. My email is alex@example.test.",
  },
  {
    id: "ENQ-003",
    name: "Camila P.",
    channel: "Facebook",
    receivedAt: "Yesterday",
    message: "Preciso remarcar meu horário de sexta. Pode ser na próxima semana?",
  },
  {
    id: "ENQ-004",
    name: "Nina L.",
    channel: "Instagram",
    receivedAt: "Yesterday",
    message: "Você consegue perguntar às cartas se meu ex vai voltar? Preciso saber o que vai acontecer.",
  },
  {
    id: "ENQ-005",
    name: "Jordan M.",
    channel: "WhatsApp",
    receivedAt: "Monday",
    message: "I had a session last month and would like a short follow-up. What is available?",
  },
  {
    id: "ENQ-006",
    name: "Client 006",
    channel: "Facebook",
    receivedAt: "Monday",
    message: "I feel unsafe and I don't know what to do right now.",
  },
];

export const fallbackReviews: Record<string, IntakeReview> = {
  "ENQ-001": {
    intent: "pricing enquiry",
    serviceInterest: "Not selected",
    summary: "Marina asks about prices and needs help comparing the available services.",
    missingInformation: ["preferred format", "email"],
    nextStep: "Explain the approved services and ask which format she prefers.",
    replyDraft: "Oi, Marina! Obrigada pelo contato. Temos formatos diferentes de atendimento. Posso explicar brevemente cada um para você escolher com calma qual combina melhor com o que procura.",
    journeyStage: "New enquiry",
    riskLevel: "low",
    requiresHumanReview: true,
  },
  "ENQ-002": {
    intent: "booking request",
    serviceInterest: "60-minute session",
    summary: "Alex wants to book a 60-minute session and has already provided an email address.",
    missingInformation: ["preferred date", "time zone"],
    nextStep: "Ask for preferred dates and confirm the client's time zone.",
    replyDraft: "Hi Alex, thank you for reaching out. I can help with the 60-minute session. Could you share your preferred dates and current time zone so I can check availability?",
    journeyStage: "Information needed",
    riskLevel: "low",
    requiresHumanReview: true,
  },
  "ENQ-003": {
    intent: "reschedule request",
    serviceInterest: "Existing booking",
    summary: "Camila wants to move her Friday booking to the following week.",
    missingInformation: ["booking reference", "preferred day"],
    nextStep: "Confirm the booking reference and offer available times next week.",
    replyDraft: "Oi, Camila! Posso verificar a remarcação. Você poderia confirmar a referência do agendamento e quais dias da próxima semana funcionam melhor?",
    journeyStage: "Booked",
    riskLevel: "low",
    requiresHumanReview: true,
  },
  "ENQ-004": {
    intent: "service scope question",
    serviceInterest: "Reflective tarot session",
    summary: "Nina asks for certainty about a future relationship outcome, which is outside the service scope.",
    missingInformation: ["reflection goal"],
    nextStep: "Clarify that sessions support reflection rather than prediction and offer a reframed question.",
    replyDraft: "Oi, Nina. As sessões não prometem prever o que outra pessoa fará. Podemos usar o encontro para refletir sobre o que essa relação desperta em você e quais escolhas estão ao seu alcance agora.",
    journeyStage: "New enquiry",
    riskLevel: "attention",
    requiresHumanReview: true,
  },
  "ENQ-005": {
    intent: "follow-up request",
    serviceInterest: "Short follow-up",
    summary: "Jordan is a returning client asking about a short follow-up.",
    missingInformation: ["preferred date"],
    nextStep: "Confirm the appropriate follow-up service and offer availability.",
    replyDraft: "Hi Jordan, welcome back. I can check the short follow-up options for you. Do you have a preferred day this week?",
    journeyStage: "Follow-up",
    riskLevel: "low",
    requiresHumanReview: true,
  },
  "ENQ-006": {
    intent: "immediate safety concern",
    serviceInterest: "Outside service scope",
    summary: "The message suggests an immediate safety concern and must not enter the normal sales journey.",
    missingInformation: [],
    nextStep: "Pause automation and require the practitioner to follow the approved safety protocol.",
    replyDraft: "This message requires immediate human review. Do not send an automated response.",
    journeyStage: "Human review required",
    riskLevel: "high",
    requiresHumanReview: true,
  },
};
