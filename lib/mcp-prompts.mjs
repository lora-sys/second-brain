// v0.20 — MCP Prompts (templated messages an AI client can render).
//
// Prompts parameterize a common AI workflow so any MCP-compatible client
// (Claude Desktop, Codex CLI, Hermes, etc.) gets the same intent without
// needing to invent the prompt string from scratch.
//
// The "messages" array returns a system message + a user message with
// placeholders for the parameter values. Clients fill them in and ship
// to their LLM.

const PROMPTS = [
  {
    name: 'summarize-week',
    description: 'Generate a weekly reflection summary. Fetches recent events and produces 6 sections: focus, done, in-progress, ignored signals, stale tasks, what to watch next.',
    arguments: [
      { name: 'date', description: 'ISO date (YYYY-MM-DD) for the week to summarize. Defaults to "this week".', required: false },
    ],
  },
  {
    name: 'draft-decision',
    description: 'Help draft a Decision Journal entry. Output template: context, options, decision, retrospective.',
    arguments: [
      { name: 'context', description: 'A short paragraph describing the situation.', required: true },
      { name: 'options', description: 'One option per line.', required: false },
    ],
  },
  {
    name: 'consolidate-tasks',
    description: 'Look at all open tasks across the vault and produce a priority list, grouping similar ones and flagging stale items.',
    arguments: [],
  },
  {
    name: 'reflect-on-day',
    description: 'Reflect on a specific day\'s events. Produces a journal entry with wins, distractions, and what to carry forward.',
    arguments: [
      { name: 'date', description: 'ISO date (YYYY-MM-DD). Defaults to today.', required: false },
    ],
  },
];

export function listPrompts() {
  return PROMPTS.slice();
}

export function getPrompt(name, args) {
  switch (name) {
    case 'summarize-week': {
      const date = (args && args.date) || 'this week';
      return {
        description: `Reflect on the events of ${date} and produce a 6-section weekly summary.`,
        messages: [
          { role: 'user', content: {
            type: 'text',
            text: `请分析 ${date} 的事件,按 6 段输出:\n` +
                  `1. 本周焦点\n2. 完成的事\n3. 进展中的事\n4. 被忽略的信号\n` +
                  `5. 陈旧任务(7 天以上未更新)\n6. 下周看什么\n\n` +
                  `先调用 list_entities(type=task) 和 list_entities(type=project) 收集数据,然后用 respond_decision_task 工具记录关键结论。\n\n` +
                  `保持简洁,中文输出。`,
          } },
        ],
      };
    }
    case 'draft-decision': {
      const context = (args && args.context) || '';
      const options = (args && args.options) || '';
      if (!context) throw new Error('context is required');
      return {
        description: `Draft a decision journal entry given context and (optionally) options.`,
        messages: [
          { role: 'user', content: {
            type: 'text',
            text: `请基于以下 context 起草一个决策条目 (Decision Journal entry):\n\n` +
                  `## Context\n${context}\n\n` +
                  `## Options\n${options || '(待我提供)'}\n\n` +
                  `输出结构:\n- 决策: (一句话)\n- 选项: 列出 2-3 个候选\n- 选了哪个 + 为什么\n- 验证信号: 30 天后怎么判断\n` +
                  `然后调用 create_entity(type=decision, ...) 把它保存到 50-Decisions/。`,
          } },
        ],
      };
    }
    case 'consolidate-tasks': {
      return {
        description: 'Look at every open task and produce a priority list.',
        messages: [
          { role: 'user', content: {
            type: 'text',
            text: `调用 list_entities(type=task) 拉取全部 task,按 status=open 或没有 status 的过滤。\n` +
                  `然后输出:\n1. 前 5 个最重要(按 due + tags 推断)\n` +
                  `2. 重复或可合并的(同标题或同 tag 群)\n` +
                  `3. 7 天以上没动的陈旧任务\n\n` +
                  `如果有合并或删除建议,调用 create_entity 或别的方式直接动手。否则只是结构化输出建议。`,
          } },
        ],
      };
    }
    case 'reflect-on-day': {
      const date = (args && args.date) || 'today';
      return {
        description: `Reflect on the events of ${date}.`,
        messages: [
          { role: 'user', content: {
            type: 'text',
            text: `请反思 ${date} 的活动。调用 GET /api/events?days=1(或 0) 收集当天的 events,产出:\n\n` +
                  `- 今天的 3 个 wins\n- 1 个最大的分心/中断\n- 明天 / 下一步要延续的一件事\n\n` +
                  `中文输出,简洁。`,
          } },
        ],
      };
    }
    default:
      throw new Error('unknown prompt: ' + name);
  }
}
