import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EnrollmentSelector = ({ onChange, initialData = {}, isSignUp = true }) => {
    const [hierarchy, setHierarchy] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [specializations, setSpecializations] = useState([]);
    const [years, setYears] = useState([]);

    const [selection, setSelection] = useState({
        institution: initialData.institution || '',
        program: initialData.program || '',
        course: initialData.course || '',
        specialization: initialData.specialization || '',
        year: initialData.year || ''
    });

    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const response = await axios.get('/api/constants/enrollment-hierarchy');
                setHierarchy(response.data.institutions);
                setInstitutions(response.data.institutions.map(inst => inst.name));
            } catch (error) {
                console.error("Error fetching enrollment hierarchy:", error);
            }
        };
        fetchHierarchy();
    }, []);

    const handleInstitutionChange = (e) => {
        const instName = e.target.value;
        const inst = hierarchy.find(h => h.name === instName);
        const newSelection = {
            ...selection,
            institution: instName,
            program: '',
            course: '',
            specialization: '',
            year: ''
        };
        setSelection(newSelection);
        setPrograms(inst ? inst.programs : []);
        setCourses([]);
        setSpecializations([]);
        setYears([]);
        onChange(newSelection);
    };

    const handleProgramChange = (e) => {
        const progName = e.target.value;
        const prog = programs.find(p => p.name === progName);
        const newSelection = {
            ...selection,
            program: progName,
            course: '',
            specialization: '',
            year: ''
        };
        setSelection(newSelection);
        setCourses(prog ? prog.courses : []);
        setSpecializations([]);
        setYears([]);
        onChange(newSelection);
    };

    const handleCourseChange = (e) => {
        const courseName = e.target.value;
        const course = courses.find(c => c.name === courseName);
        const newSelection = {
            ...selection,
            course: courseName,
            specialization: '',
            year: ''
        };
        setSelection(newSelection);
        setSpecializations(course ? course.specializations : []);

        // Calculate years based on institution's established year
        const inst = hierarchy.find(h => h.name === selection.institution);
        if (inst) {
            const startYear = inst.establishedYear || 1990;
            const currentYear = 2026;
            const yearsList = [];
            for (let y = currentYear; y >= startYear; y--) {
                yearsList.push(y.toString());
            }
            setYears(yearsList);
        }

        onChange(newSelection);
    };

    const handleSpecializationChange = (e) => {
        const specName = e.target.value;
        const newSelection = { ...selection, specialization: specName };
        setSelection(newSelection);
        onChange(newSelection);
    };

    const handleYearChange = (e) => {
        const year = e.target.value;
        const newSelection = { ...selection, year };
        setSelection(newSelection);
        onChange(newSelection);
    };

    return (
        <div className="enrollment-selector">
            <div className="form-group">
                <label>Institution *</label>
                <select value={selection.institution} onChange={handleInstitutionChange} required>
                    <option value="">Select Institution</option>
                    {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                </select>
            </div>

            {selection.institution && (
                <div className="form-group">
                    <label>Program *</label>
                    <select value={selection.program} onChange={handleProgramChange} required>
                        <option value="">Select Program</option>
                        {programs.map(prog => <option key={prog.name} value={prog.name}>{prog.name}</option>)}
                    </select>
                </div>
            )}

            {selection.program && (
                <div className="form-group">
                    <label>Course *</label>
                    <select value={selection.course} onChange={handleCourseChange} required>
                        <option value="">Select Course</option>
                        {courses.map(course => <option key={course.name} value={course.name}>{course.name}</option>)}
                    </select>
                </div>
            )}

            {selection.course && specializations.length > 0 && (
                <div className="form-group">
                    <label>Specialization *</label>
                    <select value={selection.specialization} onChange={handleSpecializationChange} required>
                        <option value="">Select Specialization</option>
                        {specializations.map(spec => <option key={spec} value={spec}>{spec}</option>)}
                    </select>
                </div>
            )}

            {selection.course && (
                <div className="form-group">
                    <label>{isSignUp ? "Year of Passed-out *" : "Graduation Year *"}</label>
                    <select value={selection.year} onChange={handleYearChange} required>
                        <option value="">Select Year</option>
                        {years.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
};

export default EnrollmentSelector;
