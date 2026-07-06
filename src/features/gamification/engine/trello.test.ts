import type { TrelloAction } from '@/features/trello/api'

import {
  archiveActivityKey,
  checkItemActivityKey,
  countHighPriorityLabels,
  isCardArchived,
  isCheckItemCompleted,
  isDoneListArrival,
} from './trello'

const DONE = 'list-done'

function action(overrides: Partial<TrelloAction> & { data?: TrelloAction['data'] }): TrelloAction {
  return {
    id: 'act-1',
    type: 'updateCard',
    date: '2026-07-06T12:00:00.000Z',
    data: { card: { id: 'card-1', name: 'Card' } },
    ...overrides,
  }
}

describe('isDoneListArrival', () => {
  it('conta card movido para a lista Concluído', () => {
    const moved = action({
      data: { card: { id: 'c', name: 'C' }, listAfter: { id: DONE } },
    })
    expect(isDoneListArrival(moved, DONE)).toBe(true)
  })

  it('ignora card movido para outra lista', () => {
    const moved = action({
      data: { card: { id: 'c', name: 'C' }, listAfter: { id: 'outra' } },
    })
    expect(isDoneListArrival(moved, DONE)).toBe(false)
  })

  it('conta card criado direto na lista Concluído', () => {
    const created = action({
      type: 'createCard',
      data: { card: { id: 'c', name: 'C' }, list: { id: DONE } },
    })
    expect(isDoneListArrival(created, DONE)).toBe(true)
  })

  it('ignora ações sem card', () => {
    const noCard = action({ data: { listAfter: { id: DONE } } })
    expect(isDoneListArrival(noCard, DONE)).toBe(false)
  })

  it('ignora updateCard sem mudança de lista (ex.: rename)', () => {
    const renamed = action({ data: { card: { id: 'c', name: 'C' } } })
    expect(isDoneListArrival(renamed, DONE)).toBe(false)
  })
})

describe('isCheckItemCompleted', () => {
  it('conta item marcado como complete', () => {
    const checked = action({
      type: 'updateCheckItemStateOnCard',
      data: {
        card: { id: 'c', name: 'C' },
        checkItem: { id: 'ci-1', name: 'Item', state: 'complete' },
      },
    })
    expect(isCheckItemCompleted(checked)).toBe(true)
  })

  it('ignora item desmarcado', () => {
    const unchecked = action({
      type: 'updateCheckItemStateOnCard',
      data: {
        card: { id: 'c', name: 'C' },
        checkItem: { id: 'ci-1', name: 'Item', state: 'incomplete' },
      },
    })
    expect(isCheckItemCompleted(unchecked)).toBe(false)
  })
})

describe('isCardArchived', () => {
  it('conta card arquivado', () => {
    const archived = action({
      data: { card: { id: 'c', name: 'C', closed: true }, old: { closed: false } },
    })
    expect(isCardArchived(archived)).toBe(true)
  })

  it('ignora card desarquivado', () => {
    const unarchived = action({
      data: { card: { id: 'c', name: 'C', closed: false }, old: { closed: true } },
    })
    expect(isCardArchived(unarchived)).toBe(false)
  })

  it('ignora updateCard sem mudança de closed (ex.: mover de lista)', () => {
    const moved = action({
      data: { card: { id: 'c', name: 'C' }, listAfter: { id: 'x' }, old: { idList: 'y' } },
    })
    expect(isCardArchived(moved)).toBe(false)
  })
})

describe('chaves anti-farm', () => {
  it('derivam do item/card, não da action', () => {
    expect(checkItemActivityKey('ci-9')).toBe('checkitem-ci-9')
    expect(archiveActivityKey('card-9')).toBe('archive-card-9')
  })
})

describe('countHighPriorityLabels', () => {
  it('conta labels vermelhas e com nome de prioridade', () => {
    expect(
      countHighPriorityLabels([
        { id: '1', name: '', color: 'red' },
        { id: '2', name: 'Urgente', color: 'blue' },
        { id: '3', name: 'Alta prioridade', color: null },
        { id: '4', name: 'backlog', color: 'green' },
      ]),
    ).toBe(3)
  })

  it('zero para lista vazia', () => {
    expect(countHighPriorityLabels([])).toBe(0)
  })
})
