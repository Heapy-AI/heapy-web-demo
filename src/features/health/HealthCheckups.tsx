import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { dataConnectionApi } from '../dataConnection/dataConnectionApi';
import { CheckupDetail, CheckupRecord } from '../dataConnection/types';
import { CheckupOpinionSections } from '../dataConnection/CheckupOpinionSections';
import { findingCards } from '../dataConnection/CheckupFindings';
import { hs } from './healthStyles';
import { colors } from '../../shared/theme/tokens';
import { format } from './healthModel';
import {
  CheckupResultCard,
  CheckupStatusBadge,
  checkupItemName,
  checkupTone,
} from './CheckupResultCard';
import { checkupCategories, checkupCategoryOf } from './checkupCategories';

// 작성자: 김진우 — 결과값 증감을 임의의 개선·악화로 판정하지 않고 기관 상태를 보존한다.
export function HealthCheckups({
  mode,
  onMode,
  onRegister,
  analysis,
  missions,
}: {
  mode: 'overview' | 'compare' | 'all';
  onMode: (mode: 'overview' | 'compare' | 'all') => void;
  onRegister: () => void;
  analysis: React.ReactNode;
  // 작성자: 김진우 — 추천 미션은 검진 내용을 다 읽은 뒤 보도록 화면 맨 아래에 둔다.
  missions: React.ReactNode;
}) {
  const records = useQuery({
    queryKey: ['health', 'checkups'],
    queryFn: ({ signal }) => dataConnectionApi.getCheckups(signal),
    retry: false,
  });
  const [currentId, setCurrent] = useState(''),
    [previousId, setPrevious] = useState(''),
    [filter, setFilter] = useState('전체'),
    // 작성자: 김진우 — 펼쳐 둔 회차 목록의 이름. 비교 화면의 두 목록이 같이 열리지 않는다.
    [openPicker, setOpenPicker] = useState('');
  const current = currentId || records.data?.[0]?.recordId,
    previous = previousId || records.data?.[1]?.recordId;
  const detail = useQuery({
    queryKey: ['health', 'checkup', current],
    queryFn: ({ signal }) => dataConnectionApi.getCheckup(current!, signal),
    enabled: !!current,
    retry: false,
  });
  const before = useQuery({
    queryKey: ['health', 'checkup', previous],
    queryFn: ({ signal }) => dataConnectionApi.getCheckup(previous!, signal),
    enabled: mode === 'compare' && !!previous,
    retry: false,
  });
  const all = detail.data?.results ?? [];
  // 작성자: 김진우 — 기관이 적어 준 순서 대신 정상·경계·이상 순으로 보여 준다.
  const statuses = [...new Set(all.map(r => r.status || '판정 미제공'))].sort(
    (a, b) => checkupTone(a).rank - checkupTone(b).rank,
  );
  const visible = all.filter(
    r => filter === '전체' || (r.status || '판정 미제공') === filter,
  );
  function selector(
    label: string,
    value: string | undefined,
    set: (value: string) => void,
  ) {
    const open = openPicker === label;
    const chosen = records.data?.find(r => r.recordId === value);
    return (
      <View style={[hs.card, open && cs.raised]}>
        <Text style={hs.muted}>{label}</Text>
        <View style={cs.pickerWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} 선택`}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpenPicker(open ? '' : label)}
            style={cs.picker}
          >
            <Text style={cs.pickerText}>
              {chosen?.measuredAt || '날짜 미제공'}
            </Text>
            <Text accessible={false} style={cs.caret}>
              {open ? '▲' : '▼'}
            </Text>
          </Pressable>
          {open && (
            <View style={cs.options}>
              {records.data?.map(r => (
                <Pressable
                  key={r.recordId}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: r.recordId === value }}
                  onPress={() => {
                    set(r.recordId);
                    setFilter('전체');
                    setOpenPicker('');
                  }}
                  style={[cs.option, r.recordId === value && cs.optionActive]}
                >
                  <Text
                    style={[
                      cs.optionText,
                      r.recordId === value && cs.optionTextActive,
                    ]}
                  >
                    {r.measuredAt || '날짜 미제공'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }
  if (records.isPending || (detail.isPending && !!current))
    return <Text style={hs.muted}>검진 기록을 불러오고 있어요.</Text>;
  if (records.isError || detail.isError)
    return (
      <View style={hs.card}>
        <Text style={hs.error}>검진 기록을 불러오지 못했어요.</Text>
        <Pressable
          onPress={() => {
            records.refetch();
            detail.refetch();
          }}
        >
          <Text style={hs.pillText}>다시 불러오기</Text>
        </Pressable>
      </View>
    );
  if (!records.data?.length)
    return (
      <View style={hs.card}>
        <Text style={hs.section}>아직 검진 기록이 없어요.</Text>
        <Pressable onPress={onRegister} style={hs.pill}>
          <Text style={hs.pillText}>검진 결과 등록하기</Text>
        </Pressable>
      </View>
    );
  return (
    <>
      {analysis}
      {/* 작성자: 김진우 — 전체 보기에서는 AI 브리핑을 먼저 읽고 회차를 고른다. */}
      {mode === 'all' && selector('검진 회차', current, setCurrent)}
      {/* 작성자: 김진우 — 판정별 개수를 AI 인사이트 바로 다음에 보여 준다. */}
      {mode !== 'compare' && (
        <View style={[hs.row, { flexWrap: 'wrap' }]}>
          {statuses.map(status => (
            <View
              key={status}
              style={[
                hs.metric,
                {
                  minWidth: 76,
                  padding: 10,
                  backgroundColor: checkupTone(status).background,
                  borderColor: checkupTone(status).border,
                },
              ]}
            >
              {/* 작성자: 김진우 — 판정 배지가 카드 폭까지 늘어나지 않고 글자 폭만 차지한다. */}
              <View style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
                <CheckupStatusBadge status={status} />
              </View>
              <Text
                style={[
                  hs.value,
                  { color: checkupTone(status).color, textAlign: 'center' },
                ]}
              >
                {all.filter(r => (r.status || '판정 미제공') === status).length}
                개
              </Text>
            </View>
          ))}
        </View>
      )}
      {mode === 'overview' && (
        <View style={hs.card}>
          <View style={hs.between}>
            <Text style={hs.section}>최근 검진 핵심 수치</Text>
            <Text style={hs.muted}>{detail.data?.measuredAt}</Text>
          </View>
          <Text style={hs.muted}>
            {detail.data?.providerName || '기관 미제공'}
          </Text>
          <View style={[hs.row, { flexWrap: 'wrap' }]}>
            {all.slice(0, 4).map((r, i) => (
              <CheckupResultCard
                key={`${r.itemCode}-${i}`}
                result={r}
                index={i}
                compact
              />
            ))}
          </View>
        </View>
      )}
      {mode !== 'compare' && (
        <>
          {mode === 'all' && (
            <>
              <View style={cs.listHeading}>
                <Text style={hs.section}>결과 전체 보기 · {all.length}개</Text>
                <Text style={hs.muted}>
                  검사기관에서 제공한 수치와 판정이에요.
                </Text>
              </View>
              <View style={[hs.row, { flexWrap: 'wrap' }]}>
                {['전체', ...statuses].map(status => (
                  <Pressable
                    key={status}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: filter === status }}
                    onPress={() => setFilter(status)}
                    style={[
                      hs.pill,
                      {
                        borderWidth: 1,
                        borderColor: checkupTone(status).border,
                        backgroundColor:
                          filter === status
                            ? checkupTone(status).color
                            : checkupTone(status).background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        hs.pillText,
                        { color: checkupTone(status).color },
                        filter === status && hs.white,
                      ]}
                    >
                      {status} ·{' '}
                      {status === '전체'
                        ? all.length
                        : all.filter(
                            r => (r.status || '판정 미제공') === status,
                          ).length}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ gap: 12 }}>
                {/* 작성자: 김진우 — 검사 종류로 묶고 그 안의 카드는 한 색으로 통일한다. */}
                {checkupCategories.map(category => {
                  const items = visible.filter(
                    r => checkupCategoryOf(r.itemCode) === category.key,
                  );
                  if (!items.length) return null;
                  return (
                    <View key={category.key} style={cs.group}>
                      <View style={hs.between}>
                        <Text style={cs.groupName}>{category.name}</Text>
                        <Text style={cs.groupCount}>{items.length}개</Text>
                      </View>
                      <Text style={hs.muted}>{category.description}</Text>
                      {items.map(r => (
                        <CheckupResultCard
                          key={`${r.itemCode}-${all.indexOf(r)}`}
                          result={r}
                          index={all.indexOf(r)}
                          palette={category.palette}
                        />
                      ))}
                    </View>
                  );
                })}
              </View>
              <CheckupOpinionSections
                examinations={findingCards(detail.data?.findings ?? []).map(
                  r => ({ ...r, editable: false }),
                )}
                overall={findingCards(detail.data?.overallOpinions ?? []).map(
                  r => ({ ...r, editable: false }),
                )}
              />
            </>
          )}
          {mode === 'overview' && (
            <View style={hs.row}>
              <Pressable
                onPress={() => onMode('all')}
                style={[hs.pill, hs.active, hs.spacer]}
              >
                <Text style={[hs.pillText, hs.white]}>결과 전체 보기</Text>
              </Pressable>
              <Pressable
                onPress={() => onMode('compare')}
                style={[hs.pill, hs.spacer]}
              >
                <Text style={hs.pillText}>과거 검진과 비교</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
      {mode === 'compare' && (
        <Compare
          before={before.data}
          current={detail.data}
          records={records.data}
          previousId={previous}
          currentId={current}
          onPrevious={setPrevious}
          onCurrent={setCurrent}
          openPicker={openPicker}
          onOpenPicker={setOpenPicker}
          notice={
            previous === current
              ? '서로 다른 회차를 선택해 주세요.'
              : !previous
              ? '비교하려면 검진 기록이 2회 이상 필요해요.'
              : before.isPending
              ? '이전 회차를 불러오고 있어요.'
              : before.isError
              ? '이전 회차를 불러오지 못했어요.'
              : ''
          }
          noticeTone={
            previous === current || before.isError ? 'error' : 'muted'
          }
        />
      )}
      {missions}
    </>
  );
}
// 작성자: 김진우 — 비교 회차는 위쪽 카드 대신 이 화면의 회차 칸에서 바로 고른다.
function PeriodPicker({
  label,
  records,
  value,
  open,
  onToggle,
  onSelect,
  align = 'left',
}: {
  label: string;
  records: CheckupRecord[];
  value?: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (recordId: string) => void;
  align?: 'left' | 'right';
}) {
  const right = align === 'right';
  const chosen = records.find(r => r.recordId === value);
  return (
    <View style={[cs.periodItem, open && cs.raised]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 회차 선택`}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={[cs.periodButton, right && cs.periodCurrent]}
      >
        <Text style={[cs.periodLabel, right && cs.periodCurrentLabel]}>
          {label}
        </Text>
        <View style={cs.periodValue}>
          <Text style={cs.periodDate}>
            {chosen?.measuredAt || '날짜 미제공'}
          </Text>
          <Text accessible={false} style={cs.caret}>
            {open ? '▲' : '▼'}
          </Text>
        </View>
      </Pressable>
      {open && (
        <View style={cs.options}>
          {records.map(r => (
            <Pressable
              key={r.recordId}
              accessibilityRole="radio"
              accessibilityState={{ checked: r.recordId === value }}
              onPress={() => onSelect(r.recordId)}
              style={[cs.option, r.recordId === value && cs.optionActive]}
            >
              <Text
                style={[
                  cs.optionText,
                  r.recordId === value && cs.optionTextActive,
                ]}
              >
                {r.measuredAt || '날짜 미제공'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
function Compare({
  before,
  current,
  records = [],
  previousId,
  currentId,
  onPrevious,
  onCurrent,
  openPicker,
  onOpenPicker,
  notice = '',
  noticeTone = 'muted',
}: {
  before?: CheckupDetail;
  current?: CheckupDetail;
  records?: CheckupRecord[];
  previousId?: string;
  currentId?: string;
  onPrevious: (recordId: string) => void;
  onCurrent: (recordId: string) => void;
  openPicker: string;
  onOpenPicker: (label: string) => void;
  // 작성자: 김진우 — 비교표 대신 띄울 안내. 회차 칸은 그대로 두고 아래만 바뀐다.
  notice?: string;
  noticeTone?: 'error' | 'muted';
}) {
  const codes = [
    ...new Set(
      [...(before?.results ?? []), ...(current?.results ?? [])].map(
        r => r.itemCode,
      ),
    ),
  ];

  return (
    <View style={cs.section}>
      <LinearGradient
        colors={['#F0EAFF', '#EAF4FB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cs.summary}
      >
        <Text style={cs.eyebrow}>검진 기록 비교</Text>
        <View style={hs.between}>
          <Text accessibilityRole="header" style={cs.title}>
            주요 항목 변화
          </Text>
          <View style={cs.count}>
            <Text style={cs.countText}>{codes.length}개 항목</Text>
          </View>
        </View>
        <Text style={cs.description}>
          두 회차의 수치 변화를 비교해보세요.
        </Text>
      </LinearGradient>

      {/* 검진 회차는 수치 카드 위에서 한 번만 표시하고, 여기서 바로 바꾼다 */}
      <View style={[cs.period, !!openPicker && cs.raised]}>
        <PeriodPicker
          label="이전 검진"
          records={records}
          value={previousId}
          open={openPicker === '이전 검진'}
          onToggle={() =>
            onOpenPicker(openPicker === '이전 검진' ? '' : '이전 검진')
          }
          onSelect={recordId => {
            onPrevious(recordId);
            onOpenPicker('');
          }}
        />

        <View accessible={false} style={cs.periodArrow}>
          <Text style={cs.periodArrowText}>→</Text>
        </View>

        <PeriodPicker
          label="현재 검진"
          records={records}
          value={currentId}
          open={openPicker === '현재 검진'}
          onToggle={() =>
            onOpenPicker(openPicker === '현재 검진' ? '' : '현재 검진')
          }
          onSelect={recordId => {
            onCurrent(recordId);
            onOpenPicker('');
          }}
          align="right"
        />
      </View>

      {/* 작성자: 김진우 — 비교할 수 없는 상태에서도 회차 칸은 남겨 다시 고를 수 있게 한다. */}
      {notice ? (
        <Text style={noticeTone === 'error' ? hs.error : hs.muted}>
          {notice}
        </Text>
      ) : (
        codes.map((code, index) => {
          const a = before?.results.find(r => r.itemCode === code),
            b = current?.results.find(r => r.itemCode === code);
          const numeric = a?.numericValue != null && b?.numericValue != null;
          const same = a && b && !!a.unit && a.unit === b.unit;
          const change =
            same && numeric
              ? Number(b.numericValue) - Number(a.numericValue)
              : null;

          const changeText =
            change !== null
              ? `${change > 0 ? '+' : ''}${format(change)}${b?.unit ? ` ${b.unit}` : ''}`
              : null;

          return (

            <View key={code} style={cs.card}>
              <View style={cs.heading}>
                <View style={cs.headingMain}>
                  <View style={cs.number}>
                    <Text style={cs.numberText}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={cs.itemName}>
                    {checkupItemName(b?.itemName || a?.itemName || '')}
                  </Text>
                </View>

                {changeText && (
                  <Text style={cs.changeValue}>{changeText}</Text>
                )}
              </View>

              <View style={cs.values}>
                <View
                  style={[
                    cs.previous,
                    a && {
                      backgroundColor: checkupTone(a.status).background,
                      borderColor: checkupTone(a.status).border,
                    },
                  ]}
                >
                  <View style={cs.valueGroup}>
                    <Text
                      style={[
                        cs.value,
                        a
                          ? { color: checkupTone(a.status || '판정 미제공').color }
                          : undefined,
                      ]}
                    >
                      {a?.value ?? '미기록'}
                    </Text>
                    {!!a?.unit && <Text style={cs.unit}>{a.unit}</Text>}
                  </View>
                </View>

                <View
                  style={[
                    cs.current,
                    b && {
                      backgroundColor: checkupTone(b.status).background,
                      borderColor: checkupTone(b.status).border,
                    },
                  ]}
                >
                  <View style={cs.valueGroup}>
                    <Text
                      style={[
                        cs.value,
                        b
                          ? { color: checkupTone(b.status || '판정 미제공').color }
                          : undefined,
                      ]}
                    >
                      {b?.value ?? '미기록'}
                    </Text>
                    {!!b?.unit && <Text style={cs.unit}>{b.unit}</Text>}
                  </View>
                </View>

                <View accessible={false} style={cs.arrow}>
                  <Text style={cs.arrowText}>→</Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  section: { gap: 14 },
  listHeading: { gap: 4 },
  // 작성자: 김진우 — 검사 종류 묶음. 이름과 한 줄 설명을 얹고 그 아래 카드를 놓는다.
  group: { gap: 10, marginTop: 6 },
  groupName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    flexShrink: 1,
  },
  groupCount: { fontSize: 11, fontWeight: '700', color: '#7A8A93' },
  // 작성자: 김진우 — 검진 회차 드롭다운. 닫혀 있으면 고른 회차만 한 줄로 보인다.
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F7FFFC',
    borderWidth: 1,
    borderColor: '#D8EEE6',
  },
  pickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    flexShrink: 1,
  },
  caret: { fontSize: 11, color: '#6E8F88' },
  // 작성자: 김진우 — 펼친 목록이 아래 카드를 밀지 않고 그 위에 겹쳐 뜬다.
  pickerWrap: { position: 'relative', zIndex: 10 },
  raised: { zIndex: 20 },
  options: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    zIndex: 20,
    elevation: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8EEE6',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    boxShadow: '0px 12px 24px rgba(34, 131, 145, 0.18)',
  },
  option: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  optionActive: { backgroundColor: '#E8F9F3' },
  optionText: { fontSize: 13, color: colors.primaryDark },
  optionTextActive: { fontWeight: '800' },
  summary: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    boxShadow: '0px 7px 18px rgba(132, 101, 190, 0.14)',
  },
  eyebrow: {
    fontSize: 11,
    color: '#80749A',
    fontWeight: '600',
    letterSpacing: 1,
  },
  title: { fontSize: 19, fontWeight: '800', color: '#40345D', flexShrink: 1 },
  count: {
    backgroundColor: '#FFFFFFB3',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#756095' },
  description: { fontSize: 12, lineHeight: 19, color: '#827893' },

  // 이전/현재 검진 정보는 모든 수치 카드의 상단에서 한 번만 표시
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  periodItem: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  // 작성자: 김진우 — 전체 보기 드롭다운처럼 테두리를 둘러 누를 수 있는 칸임을 드러낸다.
  periodButton: {
    gap: 4,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E1EF',
  },
  periodValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  periodCurrent: {
    alignItems: 'flex-end',
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#83909F',
  },
  periodCurrentLabel: {
    color: '#7653A5',
  },
  periodDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#514268',
  },
  periodArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodArrowText: {
    color: '#9F8AB9',
    fontSize: 15,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#EAE6F2',
    borderTopColor: '#FFFFFF',
    boxShadow:
      '0px 8px 20px rgba(127, 100, 177, 0.13), 0px 2px 3px rgba(127, 100, 177, 0.05)',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headingMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  number: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EEE2FF',
    boxShadow: '0px 3px 6px rgba(135, 103, 183, 0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontSize: 11, color: '#9177B4', fontWeight: '700' },
  itemName: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#514268',
    flex: 1,
  },
  changeValue: {
    fontSize: 12,
    lineHeight: 21,
    fontWeight: '700',
    color: '#64728A',
    flexShrink: 0,
    textAlign: 'right',
  },
  values: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
  },
  previous: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F5F7FA',
    borderRadius: 17,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
  },
  current: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#EEE4FF',
    borderRadius: 17,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#E4D8F6',
    boxShadow: '0px 3px 7px rgba(137, 107, 184, 0.09)',
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
  },
  unit: {
    fontSize: 11,
    color: '#8A92A3',
  },
  arrow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -12,
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#9F8AB9', fontSize: 15 },
});
