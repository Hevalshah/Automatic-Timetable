import React, { useState, useEffect } from 'react';

// Helper: Calculate Subject Assign Point (SAP) based on preference rank
const calculateSAP = (teacher, subject) => {
  const prefIndex = teacher.preferences.indexOf(subject.name);
  return prefIndex >= 0 ? (teacher.preferences.length - prefIndex) : 0;
};

// Helper: Check if teacher is senior
const isSenior = (teacher) => teacher.designation === 'Senior';

// Helper: Check if teacher is available for the subject and within load
const isAvailable = (teacher, subject, teacherLoads) =>
  teacher.expertise.includes(subject.name) &&
  (teacherLoads[teacher.id] + subject.hours) <= teacher.maxLoad;

// Helper: Get teacher priority for fixed slots (seniority, SAP, load)
const getTeacherPriority = (a, b, subject, preferenceMatrix, teacherLoads) => {
  if (isSenior(a) && !isSenior(b)) return -1;
  if (isSenior(b) && !isSenior(a)) return 1;
  if (preferenceMatrix[a.id][subject.id] !== preferenceMatrix[b.id][subject.id])
    return preferenceMatrix[b.id][subject.id] - preferenceMatrix[a.id][subject.id];
  return teacherLoads[a.id] - teacherLoads[b.id];
};

const SubjectAllocationPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [teacherLoads, setTeacherLoads] = useState({});
  const [preferenceMatrix, setPreferenceMatrix] = useState({});
  const [loading, setLoading] = useState(true);

  // Fetch teachers and subjects from backend
  useEffect(() => {
    // Replace these with your actual API endpoints
    const fetchTeachers = fetch('/api/teachers').then(res => res.json());
    const fetchSubjects = fetch('/api/subjects').then(res => res.json());

    Promise.all([fetchTeachers, fetchSubjects])
      .then(([teachersData, subjectsData]) => {
        setTeachers(teachersData);
        setSubjects(subjectsData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, []);

  // Initialize teacher loads and preference matrix when data is loaded
  useEffect(() => {
    if (teachers.length === 0 || subjects.length === 0) return;

    const initialLoads = {};
    const initialMatrix = {};
    teachers.forEach(teacher => {
      initialLoads[teacher.id] = 0;
      subjects.forEach(subject => {
        if (!initialMatrix[teacher.id]) initialMatrix[teacher.id] = {};
        initialMatrix[teacher.id][subject.id] = calculateSAP(teacher, subject);
      });
    });
    setTeacherLoads(initialLoads);
    setPreferenceMatrix(initialMatrix);
  }, [teachers, subjects]);

  // Allocation logic for fixed slots and electives
  useEffect(() => {
    if (teachers.length === 0 || subjects.length === 0) return;

    let newAllocations = [];
    let currentTeacherLoads = {...teacherLoads};

    // Fixed slots first: prioritize seniority, SAP, and load
    subjects
      .filter(subject => subject.fixedSlot)
      .forEach(subject => {
        const suitableTeachers = teachers
          .filter(teacher => isAvailable(teacher, subject, currentTeacherLoads))
          .sort((a, b) => getTeacherPriority(a, b, subject, preferenceMatrix, currentTeacherLoads));

        if (suitableTeachers.length > 0) {
          const assignedTeacher = suitableTeachers[0];
          newAllocations.push({ subjectId: subject.id, teacherId: assignedTeacher.id });
          currentTeacherLoads[assignedTeacher.id] += subject.hours;
        }
      });

    // Elective subjects: ensure same time availability (conceptual)
    // In practice, you would schedule all elective teachers at the same time
    subjects
      .filter(subject => subject.elective)
      .forEach(subject => {
        const suitableTeachers = teachers
          .filter(teacher => isAvailable(teacher, subject, currentTeacherLoads))
          .sort((a, b) => getTeacherPriority(a, b, subject, preferenceMatrix, currentTeacherLoads));

        if (suitableTeachers.length > 0) {
          const assignedTeacher = suitableTeachers[0];
          newAllocations.push({ subjectId: subject.id, teacherId: assignedTeacher.id });
          currentTeacherLoads[assignedTeacher.id] += subject.hours;
        }
      });

    setAllocations(newAllocations);
    setTeacherLoads(currentTeacherLoads);
  }, [teachers, subjects, teacherLoads, preferenceMatrix]);

  // Additional UI for showing elective groups (conceptual)
  const electiveGroups = {};
  subjects.filter(s => s.elective).forEach(subject => {
    const allocation = allocations.find(a => a.subjectId === subject.id);
    if (allocation) {
      if (!electiveGroups[allocation.teacherId]) electiveGroups[allocation.teacherId] = [];
      electiveGroups[allocation.teacherId].push(subject.name);
    }
  });

  if (loading) {
    return <div>Loading data...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Subject Teacher Allocation</h1>
      <h2>Allocations</h2>
      <table border="1" style={{ width: '100%', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Teacher</th>
            <th>Hours</th>
            <th>Load</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((allocation, index) => {
            const subject = subjects.find(s => s.id === allocation.subjectId);
            const teacher = teachers.find(t => t.id === allocation.teacherId);
            return (
              <tr key={index}>
                <td>{subject?.name}</td>
                <td>{teacher?.name}</td>
                <td>{subject?.hours}</td>
                <td>{teacherLoads[teacher?.id]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Elective Groups (Conceptual)</h2>
      <table border="1" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Teacher</th>
            <th>Electives Assigned</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(electiveGroups).map(([teacherId, group]) => {
            const teacher = teachers.find(t => t.id == teacherId);
            return (
              <tr key={teacherId}>
                <td>{teacher?.name}</td>
                <td>{group.join(', ')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SubjectAllocationPage;
