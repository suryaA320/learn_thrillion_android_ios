import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import KeyboardDismissBar from '../../components/KeyboardDismissBar';
import { useKeyboardInset } from '../../components/useKeyboardInset';
import {
  fetchFacultySyllabusPlans,
  fetchFacultySyllabusPlanDetail,
  addFacultySyllabusSubtopicComment,
  deleteFacultySyllabusPlan,
} from '../../utils/schoolApi';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function FacultySyllabusPlanningViewTab({ active, reloadTick }) {
  const modalScrollRef = useRef(null);
  const { keyboardHeight, keyboardVisible, dismissKeyboard } = useKeyboardInset();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [postingId, setPostingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchFacultySyllabusPlans();
      setPlans(Array.isArray(rows) ? rows : []);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active, reloadTick, load]);

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await fetchFacultySyllabusPlanDetail(id);
      setDetail(data);
    } catch {
      Alert.alert('Error', 'Could not load plan.');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detail?.id) return;
    const data = await fetchFacultySyllabusPlanDetail(detail.id);
    setDetail(data);
    load();
  };

  const postComment = async (subtopicId) => {
    const text = (commentDrafts[subtopicId] || '').trim();
    if (!text) return;
    setPostingId(subtopicId);
    try {
      await addFacultySyllabusSubtopicComment(subtopicId, text);
      setCommentDrafts((prev) => ({ ...prev, [subtopicId]: '' }));
      await refreshDetail();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not post comment.');
    } finally {
      setPostingId('');
    }
  };

  const scrollCommentIntoView = () => {
    setTimeout(() => {
      modalScrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 280 : 120);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f46e5" />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll}>
        {plans.length === 0 ? (
          <Text style={styles.empty}>No syllabus plans yet.</Text>
        ) : (
          plans.map((p) => (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => openDetail(p.id)}>
              <Text style={styles.cardTitle}>{p.title || `${p.subject_name} syllabus`}</Text>
              <Text style={styles.cardMeta}>
                {p.class_name} · {p.section_name} · {p.subject_name}
              </Text>
              <Text style={styles.cardMeta}>
                {p.chapter_count ?? 0} chapters · Updated {formatWhen(p.updated_at)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={detailOpen} animationType="slide" onRequestClose={() => setDetailOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Syllabus details</Text>
            <View style={styles.modalHeaderActions}>
              {keyboardVisible ? (
                <TouchableOpacity onPress={dismissKeyboard} style={styles.headerActionBtn}>
                  <Text style={styles.headerActionText}>Hide keyboard</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => setDetailOpen(false)}>
                <Text style={styles.close}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
          {detailLoading ? (
            <ActivityIndicator color="#4f46e5" style={{ marginTop: 24 }} />
          ) : (
            <ScrollView
              ref={modalScrollRef}
              style={styles.modalScroll}
              contentContainerStyle={[
                styles.modalBody,
                { paddingBottom: keyboardHeight + 40 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {detail ? (
                <>
                  <Text style={styles.detailHead}>{detail.title || 'Syllabus plan'}</Text>
                  <Text style={styles.cardMeta}>
                    {detail.class_name} · {detail.section_name} · {detail.academic_year_label}
                  </Text>
                  {(detail.chapters || []).map((ch) => (
                    <View key={ch.id} style={styles.chapterBox}>
                      <Text style={styles.chapterTitle}>
                        Ch {ch.chapter_number}{ch.name ? `: ${ch.name}` : ''}
                      </Text>
                      {(ch.subtopics || []).map((st) => (
                        <View key={st.id} style={styles.subtopicBox}>
                          <Text style={styles.subtopicName}>{st.name}</Text>
                          <Text style={styles.cardMeta}>Status: {st.status}</Text>
                          <Text style={styles.cardMeta}>
                            By {st.added_by_name || '—'} · {formatWhen(st.updated_at)}
                          </Text>
                          {(st.comments || []).map((c) => (
                            <View key={c.id} style={styles.comment}>
                              <Text>{c.comment}</Text>
                              <Text style={styles.cardMeta}>
                                {c.added_by_name} · {formatWhen(c.created_at)}
                              </Text>
                            </View>
                          ))}
                          <TextInput
                            style={styles.input}
                            value={commentDrafts[st.id] || ''}
                            onChangeText={(v) =>
                              setCommentDrafts((prev) => ({ ...prev, [st.id]: v }))
                            }
                            placeholder="Add comment"
                            onFocus={scrollCommentIntoView}
                          />
                          <TouchableOpacity
                            style={styles.commentBtn}
                            onPress={() => postComment(st.id)}
                            disabled={postingId === st.id}
                          >
                            <Text style={styles.commentBtnText}>
                              {postingId === st.id ? 'Posting…' : 'Post comment'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      Alert.alert('Delete plan?', 'This cannot be undone.', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deleteFacultySyllabusPlan(detail.id);
                              setDetailOpen(false);
                              load();
                            } catch {
                              Alert.alert('Error', 'Could not delete.');
                            }
                          },
                        },
                      ]);
                    }}
                  >
                    <Text style={styles.deleteBtnText}>Delete plan</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>
          )}
          <KeyboardDismissBar visible={keyboardVisible && detailOpen} onDismiss={dismissKeyboard} />
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 120 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  modalWrap: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  headerActionText: {
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: 13,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', flex: 1, marginRight: 8 },
  close: { color: '#4f46e5', fontWeight: '600' },
  modalScroll: { flex: 1 },
  modalBody: { padding: 16 },
  detailHead: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  chapterBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
  },
  chapterTitle: { fontWeight: '700', color: '#3730a3', marginBottom: 8 },
  subtopicBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  subtopicName: { fontWeight: '600', marginBottom: 4 },
  comment: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    backgroundColor: '#fff',
  },
  commentBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  commentBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  deleteBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '700' },
});
