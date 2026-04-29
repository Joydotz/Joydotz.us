export interface MessageCard {
  id: string
  headline: string
  body: string[]
  sign: string
}

export const messageCards: MessageCard[] = [
  {
    id: 'more-than-skin',
    headline: "YOU'RE MORE\nTHAN YOUR SKIN.",
    body: [
      "hey,",
      "some days your skin just decides to be difficult.",
      "and suddenly that's the only thing you notice in the mirror.",
      "but you're still you.",
    ],
    sign: "and there's still joy in you.",
  },
  {
    id: 'still-cute',
    headline: "STILL CUTE.\nSTILL YOU.",
    body: [
      "hey,",
      "this little moment? it's not taking your cute away.",
      "not your smile.",
      "not your vibe.",
      "not your glow.",
    ],
    sign: "still joy, too.",
  },
  {
    id: 'more-happening',
    headline: "MORE IS\nHAPPENING\nTHAN YOU THINK.",
    body: [
      "hey,",
      "not being there yet doesn't mean you're not getting there.",
      "some things move under the surface before they show up on the outside.",
    ],
    sign: "patience makes space for that. so does joy.",
  },
  {
    id: 'kindness-too',
    headline: "YOU DESERVE\nTHAT KINDNESS\nTOO.",
    body: [
      "hey,",
      "i know you give people so much grace.",
      "sometimes even when it costs you more than they notice.",
      "sometimes even when you're the one left carrying the feeling.",
    ],
    sign: "and a little joy with it.",
  },
]
