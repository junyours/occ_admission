import client from './client';

// Retry utility function with exponential backoff and user feedback
const retryWithBackoff = async (apiCall, maxRetries = 5, baseDelay = 1000, onRetry = null) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt}/${maxRetries}`);
      
      // Notify user about retry attempt
      if (onRetry && attempt > 1) {
        onRetry(attempt, maxRetries);
      }
      
      const result = await apiCall();
      console.log(`[Retry] Success on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`[Retry] Attempt ${attempt} failed:`, error?.message || error);
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff (1s, 2s, 4s, 8s)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[Retry] Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log(`[Retry] All ${maxRetries} attempts failed`);
  throw lastError;
};

// Validate exam code with retry logic
export const validateExamCode = async (examCode, onRetry = null) => {
  console.log('[Exam API] Validating exam code with retry logic:', examCode);
  
  const apiCall = async () => {
    const response = await client.post('/mobile/exam/validate-code', {
      exam_code: examCode
    });

    console.log('[Exam API] Validation response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Validation failed');
    }
  };

  try {
    return await retryWithBackoff(apiCall, 5, 1000, onRetry);
  } catch (error) {
    console.log('[Exam API] Validation failed after all retries:', error?.response?.data || error?.message);
    throw error;
  }
};

// Get exam questions (supports both regular and departmental exams) with retry logic
export const getExamQuestions = async (examId, examType = 'regular', onRetry = null) => {
  console.log('[Exam API] Fetching exam questions with retry logic for examId:', examId, 'type:', examType);
  
  const apiCall = async () => {
    const endpoint = examType === 'departmental' 
      ? `/mobile/exam/departmental/${examId}/questions`
      : `/mobile/exam/${examId}/questions`;
    
    const response = await client.get(endpoint);
    
    console.log('[Exam API] Questions response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch questions');
    }
  };

  try {
    return await retryWithBackoff(apiCall, 5, 1000, onRetry);
  } catch (error) {
    console.log('[Exam API] Questions failed after all retries:', error?.response?.data || error?.message);
    throw error;
  }
};

// Submit exam answers (supports both regular and departmental exams) with retry logic
export const submitExamAnswers = async (submission, onRetry = null) => {
  console.log('[Exam API] Submitting exam answers with retry logic:', submission);
  
  const apiCall = async () => {
    const endpoint = submission.exam_type === 'departmental'
      ? '/mobile/exam/departmental/submit'
      : '/mobile/exam/submit';
    
    console.log('[Exam API] Submission URL:', client.defaults.baseURL + endpoint);
    console.log('[Exam API] Submission headers:', client.defaults.headers);
    
    const response = await client.post(endpoint, submission);
    
    console.log('[Exam API] Submission response:', response.data);
    console.log('[Exam API] Response status:', response.status);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Submission failed');
    }
  };

  try {
    return await retryWithBackoff(apiCall, 5, 1000, onRetry);
  } catch (error) {
    console.log('[Exam API] Submission failed after all retries:', error);
    console.log('[Exam API] Error response data:', error?.response?.data);
    console.log('[Exam API] Error status:', error?.response?.status);
    console.log('[Exam API] Error message:', error?.message);
    throw error;
  }
};

// Get personality test questions for an exam
export const getPersonalityTestQuestions = async (examId) => {
  try {
    console.log('[Exam API] Fetching personality test questions for examId:', examId);
    
    const response = await client.get(`/mobile/exam/${examId}/personality-questions`);
    
    console.log('[Exam API] Personality questions response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch personality questions');
    }
  } catch (error) {
    console.log('[Exam API] Personality questions error:', error?.response?.data || error?.message);
    throw error;
  }
};

// Get all available personality test questions (fallback)
export const getAllPersonalityTestQuestions = async () => {
  try {
    console.log('[Exam API] Fetching all personality test questions');
    
    const response = await client.get('/mobile/personality-questions/all');
    
    console.log('[Exam API] All personality questions response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch all personality questions');
    }
  } catch (error) {
    console.log('[Exam API] All personality questions error:', error?.response?.data || error?.message);
    throw error;
  }
};

// Submit personality test answers only
export const submitPersonalityAnswers = async ({ examId, answers }) => {
  try {
    console.log('[Exam API] Submitting personality answers:', { examId, count: answers?.length });
    const endpoint = '/mobile/exam/personality/submit';
    const response = await client.post(endpoint, { examId, answers });
    console.log('[Exam API] Personality submission response:', response.data);
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Personality submission failed');
    }
  } catch (error) {
    console.log('[Exam API] Personality submission error:', error?.response?.data || error?.message);
    throw error;
  }
};

// Check if current examinee already took personality test
export const getPersonalityStatus = async () => {
  try {
    console.log('[Exam API] Checking personality test status');
    const response = await client.get('/mobile/personality/status');
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to check status');
    }
  } catch (error) {
    console.log('[Exam API] Personality status error:', error?.response?.data || error?.message);
    throw error;
  }
};

// Get academic exam questions only
export const getAcademicExamQuestions = async (examId) => {
  try {
    console.log('[Exam API] Fetching academic exam questions for examId:', examId);
    
    const response = await client.get(`/mobile/exam/${examId}/academic-questions`);
    
    console.log('[Exam API] Academic questions response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch academic questions');
    }
  } catch (error) {
    console.log('[Exam API] Academic questions error:', error?.response?.data || error?.message);
    throw error;
  }
};

// Get exam results
export const getExamResults = async () => {
  try {
    console.log('[Exam API] Fetching exam results');
    
    const response = await client.get('/mobile/exam/results');
    
    console.log('[Exam API] Results response:', response.data);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch results');
    }
  } catch (error) {
    console.log('[Exam API] Results error:', error?.response?.data || error?.message);
    throw error;
  }
};

// Monitoring: notify backend when exam is stopped (unpinned/exit)
export const notifyExamStopped = async (examId) => {
  try {
    console.log('[Exam API] Notifying exam stopped for examId:', examId);
    const response = await client.post('/mobile/exam/exam-stopped', { examId });
    return response.data?.success === true;
  } catch (error) {
    console.log('[Exam API] Error notifying exam stopped:', error?.response?.data || error?.message);
    return false;
  }
};

// Update exam phase (personality -> academic)
export const updateExamPhase = async (examId, examType, phase) => {
  try {
    console.log('[Exam API] Updating exam phase:', { examId, examType, phase });
    const response = await client.post('/mobile/exam/exam-started', {
      examId,
      examType,
      phase
    });
    return response.data?.success === true;
  } catch (error) {
    console.log('[Exam API] Error updating exam phase:', error?.response?.data || error?.message);
    return false;
  }
};

// ===== Exam progress persistence (server-side) =====
export async function upsertExamProgress(examRefNo, questionId, selectedAnswer, remainingSeconds) {
  try {
    const res = await client.post('/mobile/exam-progress/upsert', {
      exam_ref_no: examRefNo,
      question_id: questionId,
      selected_answer: selectedAnswer,
      remaining_seconds: remainingSeconds,
    });
    return res.data;
  } catch (e) {
    console.log('[API] upsertExamProgress error:', e?.response?.data || e.message);
    // Best-effort persistence: do not throw
    return { success: false };
  }
}

export async function fetchExamProgress(examRefNo) {
  try {
    const res = await client.get('/mobile/exam-progress', { params: { exam_ref_no: examRefNo } });
    return res.data;
  } catch (e) {
    console.log('[API] fetchExamProgress error:', e?.response?.data || e.message);
    return { success: false, answers: [], remaining_seconds: null };
  }
}

export async function clearExamProgress(examRefNo) {
  try {
    const res = await client.post('/mobile/exam-progress/clear', { exam_ref_no: examRefNo });
    return res.data;
  } catch (e) {
    console.log('[API] clearExamProgress error:', e?.response?.data || e.message);
    return { success: false };
  }
}