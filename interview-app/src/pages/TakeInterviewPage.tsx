import { useParams } from 'react-router-dom'

function TakeInterviewPage() {
  const { applicantId } = useParams<{ applicantId: string }>()

  return (
    <section className="page" aria-labelledby="take-interview-heading">
      <h1 id="take-interview-heading">Take Interview</h1>
      <p className="page-description">
        Placeholder flow for applicant <strong>{applicantId}</strong>.
      </p>
    </section>
  )
}

export default TakeInterviewPage
