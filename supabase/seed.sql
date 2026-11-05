-- ============================================================
-- TAROPEUTA · Initial data (run after schema.sql)
-- Only real, provided business information. Editable in admin.
-- ============================================================

insert into services (slug, name_en, name_pt, description_en, description_pt, price_cents, currency, duration_min, questions_included, delivery_format, sort_order) values
('reading-10',
 'Reading — 10 minutes', 'Leitura — 10 minutos',
 'Up to 3 questions. Audio reading delivered via WhatsApp. Direct guidance for a focused situation.',
 'Até 3 perguntas. Leitura em áudio enviada pelo WhatsApp. Orientação direta para uma situação específica.',
 3700, 'AUD', 10, 3, 'whatsapp_audio', 1),
('reading-15',
 'Reading — 15 minutes', 'Leitura — 15 minutos',
 'Up to 5 questions. Audio reading delivered via WhatsApp. More space to explore a situation with multiple connected questions.',
 'Até 5 perguntas. Leitura em áudio enviada pelo WhatsApp. Mais espaço para explorar uma situação com várias perguntas conectadas.',
 4700, 'AUD', 15, 5, 'whatsapp_audio', 2),
('deep-session-40',
 'Deep Session — 40 minutes', 'Sessão Profunda — 40 minutos',
 'An open, in-depth online session for deeper exploration of relationships, career, transitions, emotional patterns, decisions, and personal direction.',
 'Sessão online aberta e aprofundada para explorar relacionamentos, carreira, transições, padrões emocionais, decisões e direção pessoal.',
 8700, 'AUD', 40, null, 'online_session', 3);

-- Default availability: Mon–Fri 09:00–18:00, Sat 09:00–13:00 (edit in admin)
insert into availability_rules (weekday, start_time, end_time) values
(1,'09:00','18:00'),(2,'09:00','18:00'),(3,'09:00','18:00'),
(4,'09:00','18:00'),(5,'09:00','18:00'),(6,'09:00','13:00');

-- ── Legal / policy content ──────────────────────────────────
insert into content_blocks (key, group_name, value_en, value_pt) values
('policy.cancellation','legal',
$en$Cancellation and Rescheduling Policy

Clients may reschedule their booking up to 24 hours before the scheduled appointment time, subject to availability.

Cancellations made more than 24 hours before the scheduled appointment may be eligible for rescheduling or credit toward a future session.

Cancellations made less than 24 hours before the scheduled appointment, missed appointments, or late arrivals may not be eligible for a refund or rescheduling.

For audio readings delivered through WhatsApp, once the reading has been started or delivered, the service is considered completed and is not refundable.

Exceptional circumstances may be reviewed at the discretion of Taropeuta.$en$,
$pt$Política de Cancelamento e Reagendamento

O reagendamento pode ser solicitado com pelo menos 24 horas de antecedência do horário marcado, sujeito à disponibilidade de agenda.

Cancelamentos feitos com mais de 24 horas de antecedência podem dar direito a reagendamento ou crédito para uma futura sessão.

Cancelamentos realizados com menos de 24 horas de antecedência, faltas ou atrasos podem não ter direito a reembolso ou reagendamento.

Para leituras em áudio entregues pelo WhatsApp, após o início ou envio da leitura, o serviço será considerado concluído e não poderá ser reembolsado.

Situações excepcionais poderão ser analisadas individualmente pela Taropeuta.$pt$),

('policy.disclaimer','legal',
'Readings are intended for reflection and self-awareness and do not replace medical, psychological, legal, or financial advice.',
'As leituras são voltadas à reflexão e ao autoconhecimento e não substituem aconselhamento médico, psicológico, jurídico ou financeiro.'),

('policy.privacy','legal',
'[EDIT IN ADMIN] Privacy policy — describe what personal data is collected (contact and birth details), why it is collected, how it is stored, and how clients can request export or deletion of their data via taropeuta@gmail.com.',
'[EDITAR NO ADMIN] Política de privacidade — descreva quais dados pessoais são coletados (contato e dados de nascimento), por que são coletados, como são armazenados e como o cliente pode solicitar exportação ou exclusão dos dados pelo e-mail taropeuta@gmail.com.'),

('policy.terms','legal',
'[EDIT IN ADMIN] Terms of service — to be completed by the business owner.',
'[EDITAR NO ADMIN] Termos de uso — a serem preenchidos pela responsável.'),

('about.intro','about',
'[EDIT IN ADMIN] Personal introduction and professional photo.',
'[EDITAR NO ADMIN] Apresentação pessoal e foto profissional.'),
('about.purpose','about',
'Taropeuta exists to offer clarity for real-life decisions. Tarot and astrology are used here as tools for reflection — a space to understand patterns, weigh possibilities, and choose with more confidence.',
'A Taropeuta existe para oferecer clareza em decisões da vida real. O tarot e a astrologia são usados aqui como ferramentas de reflexão — um espaço para entender padrões, avaliar possibilidades e escolher com mais confiança.'),
('about.approach','about',
'Your reading is not a fixed prediction. It is a space for perspective: honest, warm, and practical, never deterministic or fear-based.',
'Sua leitura não é uma previsão fixa. É um espaço de perspectiva: honesto, acolhedor e prático, nunca determinista ou baseado em medo.');

-- ── FAQs ────────────────────────────────────────────────────
insert into faqs (sort_order, question_en, answer_en, question_pt, answer_pt) values
(1,'Why do you ask for my birth date, time, and city?',
 'Your birth date, birth time, and birth city are required to prepare your astrological information accurately.',
 'Por que vocês pedem minha data, horário e cidade de nascimento?',
 'Sua data, horário e cidade de nascimento são necessários para calcular suas informações astrológicas com precisão.'),
(2,'How is an audio reading delivered?',
 'After your booking is confirmed, your reading is recorded and sent to you as audio via WhatsApp at the scheduled time.',
 'Como funciona a leitura em áudio?',
 'Após a confirmação do agendamento, sua leitura é gravada e enviada em áudio pelo WhatsApp no horário agendado.'),
(3,'Can a reading predict my future?',
 'No reading is a fixed prediction. Sessions focus on clarity, patterns, possibilities, timing, and conscious choices.',
 'Uma leitura pode prever meu futuro?',
 'Nenhuma leitura é uma previsão fixa. As sessões focam em clareza, padrões, possibilidades, tempo e escolhas conscientes.'),
(4,'Which time zone are the appointment times shown in?',
 'Times are shown in the business time zone, and your own time zone is displayed during booking whenever possible.',
 'Em qual fuso horário os horários são exibidos?',
 'Os horários são exibidos no fuso do atendimento, e o seu fuso é mostrado durante o agendamento sempre que possível.'),
(5,'Can I reschedule or cancel?',
 'Yes — rescheduling is available up to 24 hours before your appointment, subject to availability. See the full cancellation policy.',
 'Posso reagendar ou cancelar?',
 'Sim — o reagendamento é possível com até 24 horas de antecedência, sujeito à disponibilidade. Veja a política completa de cancelamento.');

-- ── Email templates (bilingual, provider connected later) ──
insert into email_templates (key, subject_en, body_en, subject_pt, body_pt, reminder_hours_before) values
('booking_confirmation',
 'Your booking is confirmed — {{service_name}}',
 $en$Hi {{client_name}},

Your booking is confirmed.

Service: {{service_name}}
Date: {{date}}
Time: {{time}} ({{business_timezone}}){{client_time_line}}
Reference: {{reference}}

Next steps: {{next_steps}}

Need to reschedule? {{reschedule_link}}
Questions? Reply to this email or message us on WhatsApp: {{whatsapp_link}}

Taropeuta$en$,
 'Seu agendamento está confirmado — {{service_name}}',
 $pt$Olá {{client_name}},

Seu agendamento está confirmado.

Atendimento: {{service_name}}
Data: {{date}}
Horário: {{time}} ({{business_timezone}}){{client_time_line}}
Referência: {{reference}}

Próximos passos: {{next_steps}}

Precisa reagendar? {{reschedule_link}}
Dúvidas? Responda este e-mail ou fale conosco no WhatsApp: {{whatsapp_link}}

Taropeuta$pt$, null),

('booking_reminder',
 'Reminder: your reading is coming up',
 $en$Hi {{client_name}},

A gentle reminder that your {{service_name}} is scheduled for {{date}} at {{time}} ({{business_timezone}}).

Reference: {{reference}}

Taropeuta$en$,
 'Lembrete: sua leitura está chegando',
 $pt$Olá {{client_name}},

Um lembrete carinhoso: seu atendimento {{service_name}} está marcado para {{date}} às {{time}} ({{business_timezone}}).

Referência: {{reference}}

Taropeuta$pt$, 24),

('thank_you',
 'Thank you — and an invitation to reflect',
 $en$Hi {{client_name}},

Thank you for your session with Taropeuta. Take your time with what came up — clarity often settles in the days that follow.

If the reading was meaningful to you, we would love a short testimonial: {{testimonial_link}}

Taropeuta$en$,
 'Obrigada — e um convite à reflexão',
 $pt$Olá {{client_name}},

Obrigada pela sua sessão com a Taropeuta. Dê tempo ao que surgiu — a clareza costuma se assentar nos dias seguintes.

Se a leitura fez sentido para você, adoraríamos um breve depoimento: {{testimonial_link}}

Taropeuta$pt$, null);
