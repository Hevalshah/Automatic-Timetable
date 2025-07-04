import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Dummy data simulating XLSX input
const semesters = Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`);

const teachersData = [
  { id: 1, code: 'T001', weeklyLoad: 0 },
  { id: 2, code: 'T002', weeklyLoad: 0 },
  { id: 3, code: 'T003', weeklyLoad: 0 },
  { id: 4, code: 'T004', weeklyLoad: 0 },
];

const subjectsData = [
  { id: 'sub1', name: 'OS' },
  { id: 'sub2', name: 'DSA' },
  { id: 'sub3', name: 'DBMS' },
];

const preferenceLevels = ['Not Preferred', 'Preferred', 'Highly Preferred', 'Most Preferred'];

export default function TeacherAssignmentPage() {
  const [selectedSemester, setSelectedSemester] = useState(semesters[0]);
  const [assignments, setAssignments] = useState({});

  const handleSubjectClick = (teacherId, subjectId) => {
    setAssignments(prev => {
      const teacherKey = teacherId.toString();
      const teacherAssignments = { ...prev[teacherKey] } || {};
      const currentLevel = teacherAssignments[subjectId] || 0;
      const nextLevel = (currentLevel + 1) % 4; // Cycles through 0-3
      return {
        ...prev,
        [teacherKey]: {
          ...teacherAssignments,
          [subjectId]: nextLevel
        }
      };
    });
  };

  const calculateWeeklyLoad = (teacherId) => {
    const teacherAssignments = assignments[teacherId.toString()] || {};
    return Object.keys(teacherAssignments).length; // 1 subject = 1 hour
  };

  const handleNext = async () => {
    const formatted = Object.entries(assignments).map(([teacherIdStr, subjects]) => ({
      teacherId: parseInt(teacherIdStr),
      assignments: Object.entries(subjects).map(([subjectId, pref]) => ({
        subjectId,
        preference: preferenceLevels[pref]
      }))
    }));

    try {
      const response = await fetch('/api/save-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ semester: selectedSemester, data: formatted })
      });

      if (!response.ok) throw new Error('Failed to save assignments');

      alert('Assignments successfully saved to backend!');
    } catch (err) {
      console.error('Error saving assignments:', err);
      alert('Failed to save assignments');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-black text-white min-h-screen">
      <h2 className="text-3xl font-bold">Assign Subjects to Teachers</h2>

      {/* Semester Dropdown */}
      <div>
        <label className="text-lg mr-2">Semester:</label>
        <select
          className="p-2 border border-white rounded bg-black text-white"
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
        >
          {semesters.map((sem, index) => (
            <option key={index} value={sem}>{sem}</option>
          ))}
        </select>
      </div>

      {/* Assignment Table */}
      <div className="overflow-auto">
        <table className="min-w-full border border-white mt-4">
          <thead>
            <tr className="bg-gray-900">
              <th className="border border-white px-4 py-2">Teachers</th>
              {subjectsData.map(subject => (
                <th key={subject.id} className="border border-white px-4 py-2">{subject.name}</th>
              ))}
              <th className="border border-white px-4 py-2">Load</th>
            </tr>
          </thead>
          <tbody>
            {teachersData.map(teacher => {
              const teacherKey = teacher.id.toString();
              const load = calculateWeeklyLoad(teacher.id);
              const isOverloaded = load >= 19;
              return (
                <tr key={teacher.id} className={isOverloaded ? 'bg-red-900' : 'bg-gray-800'}>
                  <td className="border border-white px-4 py-2 text-center font-semibold">{teacher.code}</td>
                  {subjectsData.map(subject => {
                    const currentPref = assignments[teacherKey]?.[subject.id] || 0;
                    return (
                      <td key={subject.id} className="border border-white px-2 py-2 text-center">
                        <Button
                          className="text-xs p-1 bg-white text-black hover:bg-gray-300"
                          disabled={isOverloaded}
                          onClick={() => handleSubjectClick(teacher.id, subject.id)}
                        >
                          {preferenceLevels[currentPref]}
                        </Button>
                      </td>
                    );
                  })}
                  <td className="border border-white px-4 py-2 text-center">
                    {load} / 19 hrs
                    <Progress value={(load / 19) * 100} className="h-2 mt-1 bg-white" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={handleNext} className="mt-6 bg-white text-black hover:bg-gray-300">
        Next
      </Button>
    </div>
  );
}
